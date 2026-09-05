import yaml
import asyncio
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from pydantic import ValidationError

from .diagnostics import Diagnostic, from_yaml_error
from .models import SLUG_PATTERN, AppConfig, validate_config

logger = logging.getLogger("uvicorn.error")

PRESETS_DIR = Path(__file__).parent / "presets"

_SLUG_RE = re.compile(SLUG_PATTERN)


class _Dumper(yaml.Dumper):
    pass


def _str_representer(dumper: yaml.Dumper, data: str) -> yaml.ScalarNode:
    if "\n" in data:
        # YAML's literal block style (`|` / `|-`) silently falls back to a
        # quoted+escaped form when any line has trailing whitespace. Strip it so
        # multiline strings always emit cleanly.
        cleaned = "\n".join(line.rstrip() for line in data.split("\n"))
        return dumper.represent_scalar("tag:yaml.org,2002:str", cleaned, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


_Dumper.add_representer(str, _str_representer)


def _deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    """Recursively merge overlay into base. Per-key for dict values, full replace
    for everything else. Neither input is mutated."""
    out = dict(base)
    for key, value in overlay.items():
        if key in out and isinstance(out[key], dict) and isinstance(value, dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def _read_yaml(path: Path) -> tuple[Any, Diagnostic | None]:
    """Read and parse one YAML file. Returns `(data, diagnostic)`; `data` is
    None whenever a diagnostic is produced."""
    try:
        blob = path.read_bytes()
    except OSError as exc:
        return None, Diagnostic(
            severity="error",
            message=f"cannot read file: {exc.strerror or exc}",
            source=str(path),
        )
    try:
        return yaml.safe_load(blob) or {}, None
    except yaml.YAMLError as exc:
        return None, from_yaml_error(exc, path)


def _collect_presets(
    directory: Path,
) -> tuple[dict[str, dict[str, Any]], list[Diagnostic]]:
    presets: dict[str, dict[str, Any]] = {}
    diagnostics: list[Diagnostic] = []
    if not directory.is_dir():
        return presets, diagnostics
    for path in sorted(directory.glob("*.yaml")):
        data, diagnostic = _read_yaml(path)
        if diagnostic is not None:
            diagnostics.append(diagnostic)
            continue
        if not isinstance(data, dict):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"preset must be a YAML mapping, got {type(data).__name__}",
                    source=str(path),
                )
            )
            continue
        presets[path.stem] = data
    return presets, diagnostics


def _collect_dir(directory: Path) -> tuple[dict[str, dict[str, Any]], list[Diagnostic]]:
    """Load one endpoint per `*.yaml` file. Filename stem is the slug."""
    raw: dict[str, dict[str, Any]] = {}
    diagnostics: list[Diagnostic] = []
    if not directory.is_dir():
        return raw, diagnostics
    for path in sorted(directory.glob("*.yaml")):
        slug = path.stem
        if not _SLUG_RE.match(slug):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"invalid slug {slug!r} taken from the file name",
                    source=str(path),
                    hint=f"rename the file so its stem matches {SLUG_PATTERN}",
                )
            )
            continue
        data, diagnostic = _read_yaml(path)
        if diagnostic is not None:
            diagnostics.append(diagnostic)
            continue
        if not isinstance(data, dict):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"endpoint config must be a YAML mapping, got {type(data).__name__}",
                    source=str(path),
                )
            )
            continue
        raw[slug] = data
    return raw, diagnostics


def _collect_file(path: Path) -> tuple[dict[str, dict[str, Any]], list[Diagnostic]]:
    """Load every endpoint from a single top-level mapping."""
    data, diagnostic = _read_yaml(path)
    if diagnostic is not None:
        return {}, [diagnostic]
    if not isinstance(data, dict):
        return {}, [
            Diagnostic(
                severity="error",
                message=f"top-level config must be a YAML mapping of slug to endpoint, got {type(data).__name__}",
                source=str(path),
            )
        ]
    raw: dict[str, dict[str, Any]] = {}
    diagnostics: list[Diagnostic] = []
    for slug, block in data.items():
        if not _SLUG_RE.match(str(slug)):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"invalid endpoint slug {slug!r}",
                    source=str(path),
                    hint=f"slugs must match {SLUG_PATTERN}",
                )
            )
            continue
        if not isinstance(block, dict):
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"endpoint must be a YAML mapping, got {type(block).__name__}",
                    source=str(path),
                    location=f"endpoint {slug}",
                )
            )
            continue
        raw[str(slug)] = block
    return raw, diagnostics


def _resolve_and_validate(
    raw: dict[str, dict[str, Any]],
    presets: dict[str, dict[str, Any]],
    source: str,
) -> tuple[dict[str, dict[str, Any]], list[Diagnostic]]:
    """Resolve presets and run the schema, reporting per endpoint rather than
    aborting on the first bad one."""
    diagnostics: list[Diagnostic] = []
    resolved: dict[str, dict[str, Any]] = {}
    for slug, block in raw.items():
        try:
            resolved[slug] = _resolve(block, presets)
        except ValueError as exc:
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=str(exc),
                    source=source,
                    location=f"endpoint {slug}",
                    hint=f"known presets: {', '.join(sorted(presets)) or 'none'}",
                )
            )
    try:
        return AppConfig.model_validate(resolved).model_dump(
            mode="json", exclude_none=True
        ), diagnostics
    except ValidationError as exc:
        bad: set[str] = set()
        for error in exc.errors():
            loc = [str(part) for part in error["loc"]]
            slug = loc[0] if loc else "?"
            bad.add(slug)
            field = ".".join(loc[1:]) or "(endpoint)"
            diagnostics.append(
                Diagnostic(
                    severity="error",
                    message=f"{field}: {error['msg']}",
                    source=source,
                    location=f"endpoint {slug}",
                )
            )
        remaining = {s: c for s, c in resolved.items() if s not in bad}
        return validate_config(remaining), diagnostics


def _verify(resolved: dict[str, dict[str, Any]], source: str) -> list[Diagnostic]:
    """Whole-config invariants that no per-endpoint check can see. These are
    warnings: the server still starts."""
    diagnostics: list[Diagnostic] = []
    defaults = sorted(s for s, c in resolved.items() if c.get("default"))
    if len(defaults) > 1:
        diagnostics.append(
            Diagnostic(
                severity="warning",
                message=f"{len(defaults)} endpoints are marked default: {', '.join(defaults)}",
                source=source,
                hint="keep `default: true` on exactly one endpoint",
            )
        )
    elif not defaults and resolved:
        diagnostics.append(
            Diagnostic(
                severity="warning",
                message="no endpoint is marked default",
                source=source,
                hint="set `default: true` on the endpoint that should open first",
            )
        )
    return diagnostics


def _baseline(
    preset_names: list[str], presets: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Resolve a chain of presets without any endpoint-level overrides."""
    merged: dict[str, Any] = {}
    for name in preset_names:
        if name not in presets:
            raise ValueError(f"Unknown preset: {name!r}")
        merged = _deep_merge(merged, presets[name])
    return merged


def _resolve(raw: dict[str, Any], presets: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Merge listed presets left-to-right, then the endpoint's own fields on top.
    Returns the resolved dict (including `preset` as informational metadata)."""
    preset_names = raw.get("preset") or []
    merged = _baseline(preset_names, presets)
    own = {k: v for k, v in raw.items() if k != "preset"}
    merged = _deep_merge(merged, own)
    merged["preset"] = list(preset_names)
    return merged


def _minimize(
    raw: dict[str, Any], presets: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Strip override values that exactly match what the preset chain provides.
    Per-key for dict values, equality for scalars. `preset` itself is preserved."""
    preset_names = raw.get("preset") or []

    baseline = _baseline(preset_names, presets)
    out: dict[str, Any] = {}
    if preset_names:
        out["preset"] = list(preset_names)
    for key, value in raw.items():
        if key == "preset":
            continue
        baseline_value = baseline.get(key)
        if isinstance(value, dict):
            bdict = baseline_value if isinstance(baseline_value, dict) else {}
            diff = {k: v for k, v in value.items() if bdict.get(k) != v}
            if diff:
                out[key] = diff
        else:
            if value != baseline_value:
                out[key] = value
    return out


@dataclass
class InspectResult:
    raw: dict[str, dict[str, Any]]
    resolved: dict[str, dict[str, Any]]
    presets: dict[str, dict[str, Any]]
    diagnostics: list[Diagnostic]


def _is_dir_mode(path: Path) -> bool:
    """Directory mode if the path is an existing dir, or doesn't exist and
    lacks a YAML suffix (so an empty deployment with `CONFIG_PATH=/etc/conf.d`
    still starts in dir mode)."""
    if path.is_dir():
        return True
    if path.exists():
        return False
    return path.suffix.lower() not in (".yaml", ".yml")


def inspect_config(file_path: Path, presets_dir: Path = PRESETS_DIR) -> InspectResult:
    """Run the full pipeline — parse, resolve, validate, verify — collecting
    diagnostics instead of raising. Shared by startup and the check CLI."""
    presets, diagnostics = _collect_presets(presets_dir)
    raw: dict[str, dict[str, Any]] = {}
    source_diagnostics: list[Diagnostic] = []
    if not file_path.exists():
        # Supported for a fresh deployment: endpoints can be created through the
        # API afterwards, and `_persist` creates the directory. Still worth
        # saying out loud — a mistyped CONFIG_PATH looks exactly the same.
        source_diagnostics.append(
            Diagnostic(
                severity="warning",
                message="config path does not exist, starting with no endpoints",
                source=str(file_path),
                hint="check CONFIG_PATH, or create endpoints via the API",
            )
        )
    elif _is_dir_mode(file_path):
        raw, source_diagnostics = _collect_dir(file_path)
    else:
        raw, source_diagnostics = _collect_file(file_path)
    diagnostics += source_diagnostics
    source = str(file_path)
    resolved, schema_diagnostics = _resolve_and_validate(raw, presets, source)
    diagnostics += schema_diagnostics
    diagnostics += _verify(resolved, source)
    return InspectResult(raw, resolved, presets, diagnostics)


class ConfigStore:
    """Thread/async-safe wrapper around the in-memory YAML data.

    Two layers:
      * `_raw` mirrors disk verbatim (with `preset:` references and explicit
        overrides). It is the source of truth and what gets persisted.
      * `_resolved` is the merged form returned to API consumers.
    """

    def __init__(self, filepath: Path, presets_dir: Path = PRESETS_DIR) -> None:
        self._raw: dict[str, dict[str, Any]] = {}
        self._resolved: dict[str, dict[str, Any]] = {}
        self._presets: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._file_path = filepath
        self._presets_dir = presets_dir

    def _is_dir_mode(self) -> bool:
        return _is_dir_mode(self._file_path)

    def load(self) -> list[Diagnostic]:
        """Load everything from disk, returning all problems found.

        Synchronous and lock-free: this runs once at import, before the app
        serves anything. Endpoints that produced an error are left out of the
        resolved view; the caller decides whether that is fatal.
        """
        result = inspect_config(self._file_path, self._presets_dir)
        self._presets = result.presets
        self._raw = result.raw
        self._resolved = result.resolved
        logger.info(
            f"Loaded {len(self._presets)} preset{'s' if len(self._presets) != 1 else ''}: "
            f"{', '.join(sorted(self._presets)) or '—'}"
        )
        return result.diagnostics

    def count(self) -> int:
        return len(self._resolved)

    def _resolve_all(self, raw: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
        resolved_unvalidated = {
            slug: _resolve(block, self._presets) for slug, block in raw.items()
        }
        return validate_config(resolved_unvalidated)

    async def get_all(self) -> dict[str, Any]:
        """Return the resolved view. DO NOT mutate the result."""
        async with self._lock:
            return self._resolved

    async def create(self, slug: str, config: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            if slug in self._raw:
                raise ValueError(f"config with slug {slug} already exists.")
            minimized = _minimize(config, self._presets)
            new_raw = {**self._raw, slug: minimized}
            new_resolved = self._resolve_all(new_raw)
            affected: set[str] | None = {slug}
            # NOTE: Make sure only one config is the "default" endpoint.
            if new_resolved[slug].get("default"):
                for other in new_raw:
                    if other != slug:
                        new_raw[other]["default"] = False
                new_resolved = self._resolve_all(new_raw)
                affected = None  # any previously-default sibling may have changed
            self._raw = new_raw
            self._resolved = new_resolved
            self._persist(affected)
            return self._resolved[slug]

    async def patch(
        self, slug: str, apply: Callable[[dict[str, Any]], dict[str, Any]]
    ) -> dict[str, Any]:
        """Read-modify-write an endpoint atomically.

        *apply* receives the current stored raw dict and must return the new raw
        dict. Raises KeyError if the slug does not exist. Rolls back on failure.
        """
        async with self._lock:
            if slug not in self._raw:
                raise KeyError(slug)
            prev_raw = self._raw[slug]
            prev_resolved = self._resolved[slug]
            new_raw_block = _minimize(apply(prev_raw), self._presets)
            new_raw = {**self._raw, slug: new_raw_block}
            try:
                new_resolved = self._resolve_all(new_raw)
                self._raw = new_raw
                self._resolved = new_resolved
                self._persist({slug})
            except Exception:
                self._raw[slug] = prev_raw
                self._resolved[slug] = prev_resolved
                raise
            return self._resolved[slug]

    def _persist(self, affected: set[str] | None = None) -> None:
        """Atomically write raw state to disk.

        File mode rewrites the whole file (`affected` is ignored). Dir mode
        rewrites one file per slug in `affected` (or every slug if `None`); a
        slug present in `affected` but absent from `_raw` is unlinked."""
        if self._is_dir_mode():
            self._file_path.mkdir(parents=True, exist_ok=True)
            slugs = affected if affected is not None else set(self._raw)
            for slug in slugs:
                target = self._file_path / f"{slug}.yaml"
                block = self._raw.get(slug)
                if block is None:
                    target.unlink(missing_ok=True)
                    continue
                dumped = yaml.dump(
                    block,
                    Dumper=_Dumper,
                    default_flow_style=False,
                    allow_unicode=True,
                    sort_keys=False,
                )
                tmp = target.with_suffix(".tmp")
                tmp.write_text(dumped)
                tmp.replace(target)
            return
        raw = yaml.dump(
            self._raw,
            Dumper=_Dumper,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
        )
        tmp = self._file_path.with_suffix(".tmp")
        tmp.write_text(raw)
        tmp.replace(self._file_path)

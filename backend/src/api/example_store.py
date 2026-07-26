import re
from pathlib import Path
from typing import Any

import yaml

# Example queries live in per-endpoint directories as `.rq` files. Files created
# through the API use OS-safe, enumerated names (`example-001.rq`) so that the
# human-readable name — which may contain characters that are invalid in
# filenames on non-Linux systems (e.g. `"`, `?`, `:`) — can be stored in a
# leading "frontmatter" comment instead:
#
#     #+ title: My example query
#
#     SELECT * WHERE { ?s ?p ?o }
#
# The frontmatter is a YAML document: stripping the `#+ ` prefix from each
# leading line yields valid YAML, and the `title` key holds the name. Storing
# it as YAML means names with special characters are quoted correctly. Users
# may still drop in their own `.rq` files with arbitrary names; those without a
# `title` fall back to the filename as their name.
_PREFIX = "#+"
_ENUMERATED_RE = re.compile(r"^example-(\d+)$")
_TITLE_KEY = "title"


def _split_frontmatter(text: str) -> tuple[dict[str, Any], str, str]:
    """Split *text* into (metadata, frontmatter_raw, body).

    The leading run of `#+ …` lines is parsed as YAML to produce *metadata*.
    *frontmatter_raw* is that block verbatim — including a single blank
    separator line if present — so it can be preserved on update. *body* is the
    query text with the block removed.
    """
    lines = text.splitlines(keepends=True)
    yaml_lines: list[str] = []
    end = 0
    for line in lines:
        stripped = line.rstrip("\r\n")
        if not stripped.startswith(_PREFIX):
            break
        content = stripped[len(_PREFIX) :]
        if content.startswith(" "):  # drop the single separating space
            content = content[1:]
        yaml_lines.append(content)
        end += 1

    meta: dict[str, Any] = {}
    if yaml_lines:
        try:
            loaded = yaml.safe_load("\n".join(yaml_lines))
        except yaml.YAMLError:
            loaded = None
        if isinstance(loaded, dict):
            meta = loaded

    # Absorb a single blank separator line into the frontmatter block.
    if yaml_lines and end < len(lines) and lines[end].strip() == "":
        end += 1
    return meta, "".join(lines[:end]), "".join(lines[end:])


def _build_content(name: str, query: str) -> str:
    dumped = yaml.safe_dump(
        {_TITLE_KEY: name},
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
    ).rstrip("\n")
    frontmatter = "\n".join(
        f"{_PREFIX} {line}" if line else _PREFIX for line in dumped.splitlines()
    )
    return f"{frontmatter}\n\n{query}"


def _title_of(meta: dict[str, Any], path: Path) -> str:
    title = meta.get(_TITLE_KEY)
    return str(title) if title not in (None, "") else path.stem


def name_of(path: Path) -> str:
    """The display name for an example file: its frontmatter `title` or, failing
    that, the filename stem."""
    meta, _, _ = _split_frontmatter(path.read_text())
    return _title_of(meta, path)


class ExampleStore:
    """Filesystem-backed store for per-endpoint example queries."""

    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir

    def _slug_dir(self, slug: str) -> Path:
        resolved_base = self._base_dir.resolve()
        slug_dir = (resolved_base / slug).resolve()
        if not slug_dir.is_relative_to(resolved_base):
            raise ValueError("Invalid slug")
        return slug_dir

    def _find_by_name(self, slug_dir: Path, name: str) -> Path | None:
        if not slug_dir.is_dir():
            return None
        for path in sorted(slug_dir.glob("*.rq")):
            if name_of(path) == name:
                return path
        return None

    def _next_filename(self, slug_dir: Path) -> str:
        """Return the next free enumerated filename, e.g. `example-003.rq`."""
        highest = 0
        for path in slug_dir.glob("example-*.rq"):
            m = _ENUMERATED_RE.match(path.stem)
            if m:
                highest = max(highest, int(m.group(1)))
        return f"example-{highest + 1:03d}.rq"

    def count(self) -> int:
        """Total number of example queries across all endpoints."""
        if not self._base_dir.is_dir():
            return 0
        return sum(1 for _ in self._base_dir.glob("*/*.rq"))

    def list(self, slug: str) -> list[tuple[str, str]]:
        """Return (name, query) pairs for an endpoint, or [] if it has none."""
        slug_dir = self._slug_dir(slug)
        if not slug_dir.is_dir():
            return []
        examples = []
        for path in sorted(slug_dir.glob("*.rq")):
            meta, _, body = _split_frontmatter(path.read_text())
            examples.append((_title_of(meta, path), body))
        return examples

    def create(self, slug: str, name: str, query: str) -> None:
        """Create a new example. Raises FileExistsError if *name* is taken."""
        slug_dir = self._slug_dir(slug)
        if self._find_by_name(slug_dir, name) is not None:
            raise FileExistsError(name)
        slug_dir.mkdir(parents=True, exist_ok=True)
        (slug_dir / self._next_filename(slug_dir)).write_text(
            _build_content(name, query)
        )

    def update(self, slug: str, name: str, query: str) -> None:
        """Overwrite an existing example's query, preserving its frontmatter.
        Raises FileNotFoundError if *name* does not exist."""
        slug_dir = self._slug_dir(slug)
        path = self._find_by_name(slug_dir, name)
        if path is None:
            raise FileNotFoundError(name)
        _, frontmatter_raw, _ = _split_frontmatter(path.read_text())
        path.write_text(frontmatter_raw + query)

    def delete(self, slug: str, name: str) -> None:
        """Delete an existing example. Raises FileNotFoundError if absent."""
        slug_dir = self._slug_dir(slug)
        path = self._find_by_name(slug_dir, name)
        if path is None:
            raise FileNotFoundError(name)
        path.unlink()

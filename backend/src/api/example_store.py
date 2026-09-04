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
#
# An optional `order` key controls the position of an example in the listing:
#
#     #+ title: My example query
#     #+ order: 20
#
# Examples are sorted by `order` ascending; those without one sort after all
# ordered examples. Ties — and unordered examples — fall back to filename order.
_PREFIX = "#+"
_ENUMERATED_RE = re.compile(r"^example-(\d+)$")
_TITLE_KEY = "title"
_ORDER_KEY = "order"


class _Unset:
    """Sentinel distinguishing an omitted *order* argument from an explicit None."""


_UNSET = _Unset()


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


def _build_content(meta: dict[str, Any], query: str) -> str:
    dumped = yaml.safe_dump(
        meta,
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


def _order_of(meta: dict[str, Any]) -> int | None:
    order = meta.get(_ORDER_KEY)
    return order if isinstance(order, int) and not isinstance(order, bool) else None


def _sort_key(meta: dict[str, Any], path: Path) -> tuple[bool, int, str]:
    """Sort by `order` ascending, unordered examples last, ties by filename."""
    order = _order_of(meta)
    return (order is None, order or 0, path.name)


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

    def list(self, slug: str) -> list[tuple[str, str, int | None]]:
        """Return (name, query, order) triples for an endpoint, sorted by
        `order`, or [] if the endpoint has none."""
        slug_dir = self._slug_dir(slug)
        if not slug_dir.is_dir():
            return []
        examples = []
        for path in sorted(slug_dir.glob("*.rq")):
            meta, _, body = _split_frontmatter(path.read_text())
            examples.append((_sort_key(meta, path), _title_of(meta, path), body, meta))
        examples.sort(key=lambda e: e[0])
        return [(name, body, _order_of(meta)) for _, name, body, meta in examples]

    def create(
        self, slug: str, name: str, query: str, order: int | None = None
    ) -> None:
        """Create a new example. Raises FileExistsError if *name* is taken."""
        slug_dir = self._slug_dir(slug)
        if self._find_by_name(slug_dir, name) is not None:
            raise FileExistsError(name)
        slug_dir.mkdir(parents=True, exist_ok=True)
        meta: dict[str, Any] = {_TITLE_KEY: name}
        if order is not None:
            meta[_ORDER_KEY] = order
        (slug_dir / self._next_filename(slug_dir)).write_text(
            _build_content(meta, query)
        )

    def update(
        self, slug: str, name: str, query: str, order: int | None | _Unset = _UNSET
    ) -> None:
        """Overwrite an existing example's query. The frontmatter is preserved
        verbatim unless *order* is given, in which case that key is set (or
        removed, when None) and the rest of the frontmatter is kept.
        Raises FileNotFoundError if *name* does not exist."""
        slug_dir = self._slug_dir(slug)
        path = self._find_by_name(slug_dir, name)
        if path is None:
            raise FileNotFoundError(name)
        meta, frontmatter_raw, _ = _split_frontmatter(path.read_text())
        if isinstance(order, _Unset):
            path.write_text(frontmatter_raw + query)
            return
        meta.setdefault(_TITLE_KEY, _title_of(meta, path))
        if order is None:
            meta.pop(_ORDER_KEY, None)
        else:
            meta[_ORDER_KEY] = order
        path.write_text(_build_content(meta, query))

    def reorder(self, slug: str, names: list[str]) -> None:
        """Assign `order` 1..n to the named examples, in the given order.
        Examples not listed are left untouched — send the complete list to get
        a fully predictable ordering. Raises FileNotFoundError for an unknown
        name; nothing is written unless every name resolves."""
        slug_dir = self._slug_dir(slug)
        paths = []
        for name in names:
            path = self._find_by_name(slug_dir, name)
            if path is None:
                raise FileNotFoundError(name)
            paths.append(path)
        for position, path in enumerate(paths, start=1):
            meta, _, body = _split_frontmatter(path.read_text())
            meta.setdefault(_TITLE_KEY, _title_of(meta, path))
            meta[_ORDER_KEY] = position
            path.write_text(_build_content(meta, body))

    def delete(self, slug: str, name: str) -> None:
        """Delete an existing example. Raises FileNotFoundError if absent."""
        slug_dir = self._slug_dir(slug)
        path = self._find_by_name(slug_dir, name)
        if path is None:
            raise FileNotFoundError(name)
        path.unlink()

"""Human-readable problem reports for config loading.

One `Diagnostic` per problem, collected across every stage (parse, resolve,
validate, verify) so a broken config surfaces all of its issues at once instead
of one restart at a time.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml

Severity = Literal["error", "warning"]


@dataclass
class Diagnostic:
    severity: Severity
    message: str
    source: str | None = None
    location: str | None = None
    snippet: str | None = None
    hint: str | None = None

    def format(self) -> str:
        label = "error" if self.severity == "error" else "warning"
        where = " ".join(p for p in (self.source, self.location) if p)
        head = f"{label}: {self.message}"
        lines = [head]
        if where:
            lines.append(f"  --> {where}")
        if self.snippet:
            lines.extend(f"   {line}" for line in self.snippet.splitlines())
        if self.hint:
            lines.append(f"  help: {self.hint}")
        return "\n".join(lines)


def format_report(diagnostics: list[Diagnostic]) -> str:
    """Render all diagnostics as one block, errors first."""
    ordered = sorted(diagnostics, key=lambda d: d.severity != "error")
    return "\n\n".join(d.format() for d in ordered)


def has_errors(diagnostics: list[Diagnostic]) -> bool:
    return any(d.severity == "error" for d in diagnostics)


def from_yaml_error(exc: yaml.YAMLError, path: Path) -> Diagnostic:
    """Turn a pyyaml exception into a diagnostic that names the real file.

    pyyaml reports `<byte string>` when parsing bytes, so the mark's own file
    name is useless here; only its line/column and snippet are worth keeping.
    """
    problem = getattr(exc, "problem", None)
    context = getattr(exc, "context", None)
    detail = f"{context}, {problem}" if context and problem else problem
    mark = getattr(exc, "problem_mark", None)
    location = f"line {mark.line + 1}, column {mark.column + 1}" if mark else None
    snippet = mark.get_snippet() if mark else None
    return Diagnostic(
        severity="error",
        message=f"malformed YAML: {detail}" if detail else "malformed YAML",
        source=str(path),
        location=location,
        snippet=snippet,
    )

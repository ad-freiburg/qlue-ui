"""Validate a config without starting the server.

    uv run python -m api.check_config [PATH]

Exits 1 if any error was found, 0 otherwise (warnings are printed either way).
"""

import os
import sys
from pathlib import Path

from .config_store import PRESETS_DIR, inspect_config
from .diagnostics import format_report, has_errors


def main(argv: list[str]) -> int:
    raw_path = argv[1] if len(argv) > 1 else os.getenv("CONFIG_PATH", "config.yaml")
    path = Path(raw_path)
    result = inspect_config(path, PRESETS_DIR)
    if result.diagnostics:
        print(format_report(result.diagnostics), file=sys.stderr)
        print(file=sys.stderr)
    if has_errors(result.diagnostics):
        print(f"{path}: invalid", file=sys.stderr)
        return 1
    count = len(result.resolved)
    print(f"{path}: ok, {count} endpoint{'s' if count != 1 else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

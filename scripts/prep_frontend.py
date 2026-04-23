#!/usr/bin/env python3
from __future__ import annotations

import os

from _common import ROOT, require_command, run


def main() -> None:
    require_command("npm")
    frontend_dir = ROOT / "frontend"
    out_dir = frontend_dir / "out"

    print("Installing frontend dependencies...")
    run(["npm", "ci"], cwd=frontend_dir)

    print("Building static frontend export...")
    env = {"NEXT_PUBLIC_API_URL": os.environ.get("NEXT_PUBLIC_API_URL", "")}
    run(["npm", "run", "build"], cwd=frontend_dir, env=env)

    if not out_dir.exists():
        raise SystemExit("Expected build output directory frontend/out was not created.")

    print("Frontend package ready at frontend/out")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import shutil
import zipfile

from _common import ROOT, require_command, run


def main() -> None:
    require_command("python3")

    backend_dir = ROOT / "backend"
    build_dir = ROOT / "dist" / "backend-lambda"
    artifact_path = ROOT / "dist" / "backend-lambda.zip"

    print("Preparing Lambda package...")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    run(["python3", "-m", "pip", "install", "--upgrade", "pip"])
    run(
        [
            "python3",
            "-m",
            "pip",
            "install",
            "-r",
            str(backend_dir / "requirements.lambda.txt"),
            "-t",
            str(build_dir),
        ]
    )

    shutil.copytree(backend_dir / "app", build_dir / "app", dirs_exist_ok=True)

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(artifact_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in build_dir.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(build_dir))

    print(f"Backend Lambda artifact ready at {artifact_path}")


if __name__ == "__main__":
    main()

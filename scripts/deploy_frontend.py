#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

from _common import SCRIPTS_DIR, ensure_environment, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy frontend (prep -> provision -> upload).")
    parser.add_argument("--environment", default=None, help="dev/staging/prod")
    parser.add_argument("--skip-prep", action="store_true")
    parser.add_argument("--skip-tf", action="store_true")
    parser.add_argument("--upload-only", action="store_true")
    parser.add_argument("--provision-only", action="store_true")
    return parser.parse_args()


def call(script: str, environment: str) -> None:
    run(["python3", str(SCRIPTS_DIR / script)], env={"TF_ENVIRONMENT": environment})


def main() -> None:
    args = parse_args()
    environment = args.environment or os.environ.get("TF_ENVIRONMENT", "dev")
    ensure_environment(environment)

    upload_only = args.upload_only
    skip_prep = args.skip_prep or upload_only
    skip_tf = args.skip_tf or upload_only

    if not skip_prep:
        call("prep_frontend.py", environment)

    if not skip_tf:
        run(
            [
                "python3",
                str(SCRIPTS_DIR / "terraform_provision.py"),
                "--environment",
                environment,
            ],
            env={"TF_ENVIRONMENT": environment},
        )

    if args.provision_only:
        return

    call("upload_frontend.py", environment)


if __name__ == "__main__":
    main()

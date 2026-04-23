#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os

from _common import SCRIPTS_DIR, ensure_environment, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy backend Lambda (prep -> provision -> upload).")
    parser.add_argument("--environment", default=None, help="dev/staging/prod")
    parser.add_argument("--skip-prep", action="store_true")
    parser.add_argument("--skip-tf", action="store_true")
    parser.add_argument("--upload-only", action="store_true")
    parser.add_argument("--provision-only", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    environment = args.environment or os.environ.get("TF_ENVIRONMENT", "dev")
    ensure_environment(environment)

    upload_only = args.upload_only
    skip_prep = args.skip_prep or upload_only
    skip_tf = args.skip_tf or upload_only

    env = {"TF_ENVIRONMENT": environment}
    if not skip_prep:
        run(["python3", str(SCRIPTS_DIR / "prep_backend_lambda.py")], env=env)

    if not skip_tf:
        run(["python3", str(SCRIPTS_DIR / "terraform_provision.py"), "--environment", environment], env=env)

    if args.provision_only:
        return

    run(["python3", str(SCRIPTS_DIR / "upload_backend_lambda.py")], env=env)


if __name__ == "__main__":
    main()

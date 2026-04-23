#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os

from _common import SCRIPTS_DIR, ensure_environment, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy frontend and backend sequentially.")
    parser.add_argument("--environment", default=None, help="dev/staging/prod")
    parser.add_argument("--skip-prep", action="store_true")
    parser.add_argument("--skip-tf", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    environment = args.environment or os.environ.get("TF_ENVIRONMENT", "dev")
    ensure_environment(environment)

    env = {"TF_ENVIRONMENT": environment}
    front_cmd = ["python3", str(SCRIPTS_DIR / "deploy_frontend.py"), "--environment", environment]
    back_cmd = [
        "python3",
        str(SCRIPTS_DIR / "deploy_backend.py"),
        "--environment",
        environment,
        "--skip-tf",
    ]

    if args.skip_prep:
        front_cmd.append("--skip-prep")
        back_cmd.append("--skip-prep")
    if args.skip_tf:
        front_cmd.append("--skip-tf")

    run(front_cmd, env=env)
    run(back_cmd, env=env)
    print(f"Completed frontend + backend deploy flow for {environment}.")


if __name__ == "__main__":
    main()

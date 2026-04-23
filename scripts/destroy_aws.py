#!/usr/bin/env python3
from __future__ import annotations

import argparse

from _common import TERRAFORM_DIR, ensure_environment, require_command, run, terraform_init


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Destroy Terraform-managed resources.")
    parser.add_argument("environment", nargs="?", default="dev")
    parser.add_argument("--yes", action="store_true", help="Skip interactive confirmation")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    require_command("terraform")
    ensure_environment(args.environment)

    terraform_init(TERRAFORM_DIR)

    if not args.yes:
        confirm = input("Type 'destroy' to continue: ").strip()
        if confirm != "destroy":
            raise SystemExit("Aborted.")

    run(
        [
            "terraform",
            "destroy",
            "-auto-approve",
            f"-var=environment={args.environment}",
        ],
        cwd=TERRAFORM_DIR,
    )


if __name__ == "__main__":
    main()

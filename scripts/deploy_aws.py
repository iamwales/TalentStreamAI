#!/usr/bin/env python3
from __future__ import annotations

import argparse

from _common import SCRIPTS_DIR, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compatibility wrapper around terraform_provision.py.")
    parser.add_argument("environment", nargs="?", default="dev")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print("scripts/deploy_aws.py delegates to scripts/terraform_provision.py")
    run(
        [
            "python3",
            str(SCRIPTS_DIR / "terraform_provision.py"),
            "--environment",
            args.environment,
        ],
        env={"TF_ENVIRONMENT": args.environment},
    )


if __name__ == "__main__":
    main()

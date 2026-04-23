#!/usr/bin/env python3
from __future__ import annotations

import argparse

from _common import TERRAFORM_DIR, ensure_environment, ensure_tfvars, require_command, run, terraform_init


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Terraform init/plan/apply helper.")
    parser.add_argument(
        "--environment",
        default=None,
        help="Deployment environment (dev/staging/prod). Defaults to TF_ENVIRONMENT or dev.",
    )
    parser.add_argument("--plan-only", action="store_true", help="Only run terraform plan.")
    parser.add_argument(
        "--no-auto-approve",
        action="store_true",
        help="Disable -auto-approve when applying.",
    )
    parser.add_argument("extra_args", nargs=argparse.REMAINDER)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    require_command("terraform")

    environment = args.environment or __import__("os").environ.get("TF_ENVIRONMENT", "dev")
    ensure_environment(environment)

    terraform_init(TERRAFORM_DIR)
    ensure_tfvars(TERRAFORM_DIR)

    run(["terraform", "fmt", "-check"], cwd=TERRAFORM_DIR)
    run(["terraform", "validate"], cwd=TERRAFORM_DIR)

    passthrough = args.extra_args
    if passthrough and passthrough[0] == "--":
        passthrough = passthrough[1:]

    if args.plan_only:
        run(["terraform", "plan", f"-var=environment={environment}", *passthrough], cwd=TERRAFORM_DIR)
        return

    plan_file = f"tfplan-{environment}"
    run(
        ["terraform", "plan", f"-var=environment={environment}", f"-out={plan_file}", *passthrough],
        cwd=TERRAFORM_DIR,
    )

    apply_cmd = ["terraform", "apply", plan_file]
    if not args.no_auto_approve:
        apply_cmd.insert(2, "-auto-approve")
    run(apply_cmd, cwd=TERRAFORM_DIR)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from _common import TERRAFORM_DIR, capture, ensure_environment, ensure_tfvars, require_command, run, terraform_init


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="One-time OIDC deploy role bootstrap using targeted Terraform apply."
    )
    parser.add_argument("--environment", default=None, help="dev/staging/prod")
    return parser.parse_args()


def should_create_oidc_provider(tfvars_path: Path) -> bool:
    if not tfvars_path.exists():
        return True
    content = tfvars_path.read_text(encoding="utf-8")
    return "create_oidc_provider = false" not in content


def main() -> None:
    args = parse_args()
    require_command("terraform")

    environment = args.environment or __import__("os").environ.get("TF_ENVIRONMENT", "dev")
    ensure_environment(environment)

    terraform_init(TERRAFORM_DIR)
    ensure_tfvars(TERRAFORM_DIR)

    targets = [
        "-target=aws_iam_role.github_actions_deploy",
        "-target=aws_iam_policy.github_actions_deploy",
        "-target=aws_iam_role_policy_attachment.github_actions_deploy",
    ]
    if should_create_oidc_provider(TERRAFORM_DIR / "terraform.tfvars"):
        targets.append("-target=aws_iam_openid_connect_provider.github")

    run(
        [
            "terraform",
            "apply",
            "-auto-approve",
            f"-var=environment={environment}",
            *targets,
        ],
        cwd=TERRAFORM_DIR,
    )

    role_arn = capture(["terraform", "output", "-raw", "github_actions_role_arn"], cwd=TERRAFORM_DIR)
    print("\nOIDC bootstrap complete.")
    print("GitHub Actions role ARN:")
    print(role_arn)


if __name__ == "__main__":
    main()

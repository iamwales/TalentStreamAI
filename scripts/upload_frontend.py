#!/usr/bin/env python3
from __future__ import annotations

import os

from _common import ROOT, TERRAFORM_DIR, capture, require_command, run


def main() -> None:
    require_command("aws")
    require_command("terraform")

    environment = os.environ.get("TF_ENVIRONMENT", "dev")
    frontend_out_dir = ROOT / "frontend" / "out"
    if not frontend_out_dir.exists():
        raise SystemExit(
            f"Missing frontend build output at {frontend_out_dir}. Run scripts/prep_frontend.py first."
        )

    bucket_name = capture(["terraform", "output", "-raw", "frontend_bucket_name"], cwd=TERRAFORM_DIR)
    distribution_id = capture(
        ["terraform", "output", "-raw", "cloudfront_distribution_id"], cwd=TERRAFORM_DIR
    )

    print(f"Syncing frontend assets to s3://{bucket_name}...")
    run(["aws", "s3", "sync", f"{frontend_out_dir}/", f"s3://{bucket_name}/", "--delete"])

    print(f"Creating CloudFront invalidation for distribution {distribution_id}...")
    run(
        [
            "aws",
            "cloudfront",
            "create-invalidation",
            "--distribution-id",
            distribution_id,
            "--paths",
            "/*",
        ]
    )

    print(f"Frontend upload complete for environment {environment}.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from _common import require_command, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap Terraform remote state resources (S3 + DynamoDB)."
    )
    parser.add_argument("state_bucket_name")
    parser.add_argument("lock_table_name")
    parser.add_argument("region", nargs="?", default="us-east-1")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    require_command("aws")

    bucket = args.state_bucket_name
    table = args.lock_table_name
    region = args.region

    print(f"Bootstrapping Terraform state resources in region: {region}")

    head_bucket = run(
        ["aws", "s3api", "head-bucket", "--bucket", bucket],
        check=False,
    )
    if head_bucket.returncode == 0:
        print(f"State bucket already exists: {bucket}")
    else:
        if region == "us-east-1":
            run(["aws", "s3api", "create-bucket", "--bucket", bucket, "--region", region])
        else:
            run(
                [
                    "aws",
                    "s3api",
                    "create-bucket",
                    "--bucket",
                    bucket,
                    "--region",
                    region,
                    "--create-bucket-configuration",
                    f"LocationConstraint={region}",
                ]
            )
        print(f"Created bucket: {bucket}")

    run(
        [
            "aws",
            "s3api",
            "put-bucket-versioning",
            "--bucket",
            bucket,
            "--versioning-configuration",
            "Status=Enabled",
        ]
    )

    run(
        [
            "aws",
            "s3api",
            "put-bucket-encryption",
            "--bucket",
            bucket,
            "--server-side-encryption-configuration",
            json.dumps(
                {
                    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
                }
            ),
        ]
    )

    run(
        [
            "aws",
            "s3api",
            "put-public-access-block",
            "--bucket",
            bucket,
            "--public-access-block-configuration",
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
        ]
    )

    describe_table = run(
        ["aws", "dynamodb", "describe-table", "--table-name", table, "--region", region],
        check=False,
    )
    if describe_table.returncode == 0:
        print(f"Lock table already exists: {table}")
    else:
        run(
            [
                "aws",
                "dynamodb",
                "create-table",
                "--table-name",
                table,
                "--attribute-definitions",
                "AttributeName=LockID,AttributeType=S",
                "--key-schema",
                "AttributeName=LockID,KeyType=HASH",
                "--billing-mode",
                "PAY_PER_REQUEST",
                "--region",
                region,
            ]
        )
        print(f"Created lock table: {table}")

    print(
        "\nBootstrap complete.\n\n"
        "Suggested terraform/backend.hcl:\n"
        f'bucket         = "{bucket}"\n'
        'key            = "talentstreamai/dev/terraform.tfstate"\n'
        f'region         = "{region}"\n'
        f'dynamodb_table = "{table}"\n'
        "encrypt        = true\n"
    )


if __name__ == "__main__":
    main()

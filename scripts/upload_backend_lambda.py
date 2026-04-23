#!/usr/bin/env python3
from __future__ import annotations

import os

from _common import ROOT, TERRAFORM_DIR, capture, require_command, run


def main() -> None:
    require_command("aws")
    require_command("terraform")

    environment = os.environ.get("TF_ENVIRONMENT", "dev")
    artifact_path = ROOT / "dist" / "backend-lambda.zip"
    if not artifact_path.exists():
        raise SystemExit(
            f"Missing artifact {artifact_path}. Run scripts/prep_backend_lambda.py first."
        )

    function_name = capture(["terraform", "output", "-raw", "lambda_function_name"], cwd=TERRAFORM_DIR)
    print(f"Updating Lambda function code for {function_name}...")
    run(
        [
            "aws",
            "lambda",
            "update-function-code",
            "--function-name",
            function_name,
            "--zip-file",
            f"fileb://{artifact_path}",
        ]
    )
    print(f"Lambda upload complete for environment {environment}.")


if __name__ == "__main__":
    main()

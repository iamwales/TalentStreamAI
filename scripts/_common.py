#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "scripts"
TERRAFORM_DIR = ROOT / "terraform"


def require_command(command: str) -> None:
    from shutil import which

    if which(command) is None:
        raise SystemExit(f"{command} is required but not available on PATH.")


def run(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        env=merged_env,
        text=True,
        check=check,
    )


def capture(command: list[str], *, cwd: Path | None = None) -> str:
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        text=True,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.strip()


def ensure_environment(environment: str) -> None:
    if environment not in {"dev", "staging", "prod"}:
        raise SystemExit(f"Invalid environment: {environment}. Expected dev, staging, or prod.")


def terraform_init(terraform_dir: Path) -> None:
    backend_hcl = terraform_dir / "backend.hcl"
    use_local_state = os.getenv("TALENTSTREAM_USE_LOCAL_TF_STATE") == "1"

    if backend_hcl.exists():
        run(["terraform", "init", "-input=false", "-backend-config=backend.hcl"], cwd=terraform_dir)
    elif use_local_state:
        print("Using local Terraform state (TALENTSTREAM_USE_LOCAL_TF_STATE=1).")
        run(["terraform", "init", "-input=false", "-backend=false"], cwd=terraform_dir)
    else:
        raise SystemExit(
            f"Missing {backend_hcl}. Copy backend.hcl.example to backend.hcl, "
            "or set TALENTSTREAM_USE_LOCAL_TF_STATE=1."
        )


def ensure_tfvars(terraform_dir: Path) -> None:
    tfvars = terraform_dir / "terraform.tfvars"
    if not tfvars.exists():
        raise SystemExit(
            f"Missing {tfvars}. Copy terraform.tfvars.example to terraform.tfvars and update values."
        )


def passthrough_args(args: Iterable[str]) -> list[str]:
    return list(args)


def print_step(message: str) -> None:
    print(f"\n==> {message}")
    sys.stdout.flush()

#!/usr/bin/env bash
# Build the API Lambda zip. The runtime is python3.12 on Linux x86_64 (see terraform).
# If you run this on macOS/Windows, `pip install -t` can pull the wrong platform wheels
# (e.g. pydantic_core’s native module), which causes at cold start:
#   Runtime.ImportModuleError: No module named 'pydantic_core._pydantic_core'
# On Linux x86_64 we install with the local pip (correct manylinux wheels).
# Otherwise we install inside the official Lambda image (linux/amd64) via Docker.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_ZIP="${ROOT}/terraform/build/api_lambda.zip"
PKG_DIR="${ROOT}/terraform/build/lambda_pkg"
REQUIREMENTS="${PKG_DIR}/requirements.txt"
LAMBDA_IMAGE="${LAMBDA_BUILD_IMAGE:-public.ecr.aws/lambda/python:3.12}"

echo "Building Lambda zip: ${OUT_ZIP}"

rm -f "${OUT_ZIP}"
rm -rf "${PKG_DIR}"
mkdir -p "${PKG_DIR}"

if command -v uv >/dev/null 2>&1; then
  echo "Using uv export (frozen) from backend lockfile"
  # Omit hashes so a machine that generated the lock on another OS does not block wheel choice.
  uv export --frozen --no-dev --no-hashes --project "${ROOT}/backend" -o "${REQUIREMENTS}"
else
  echo "uv not found; using backend/lambda/requirements-lambda.txt"
  REQUIREMENTS="${ROOT}/backend/lambda/requirements-lambda.txt"
fi

host_is_linux_amd64() {
  [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]]
}

install_requirements() {
  if host_is_linux_amd64 && [[ -z "${USE_DOCKER_LAMBDA:-}" ]]; then
    echo "Host is Linux x86_64: installing dependencies with local pip (matches Lambda Linux)"
    python3 -m pip install -r "${REQUIREMENTS}" -t "${PKG_DIR}" --no-cache-dir
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "This host is not Linux x86_64. Install Docker and retry, or run this script on" >&2
    echo "a Linux x86_64 host (e.g. GitHub Actions) so dependencies are Linux wheels." >&2
    echo "Or set: USE_DOCKER_LAMBDA=1 and ensure Docker is available." >&2
    exit 1
  fi

  echo "Installing dependencies with Docker (${LAMBDA_IMAGE}, platform linux/amd64) to match AWS Lambda"
  # Base image default entrypoint is the runtime interface; override to run pip.
  docker run --rm --platform linux/amd64 \
    --entrypoint /bin/sh \
    -v "${REQUIREMENTS}:/req.txt:ro" \
    -v "${PKG_DIR}:/out" \
    "${LAMBDA_IMAGE}" \
    -c 'set -e; python3 -m pip install -q -U pip; python3 -m pip install -r /req.txt -t /out --no-cache-dir'
}

install_requirements

cp -R "${ROOT}/backend/app" "${PKG_DIR}/app"
cp "${ROOT}/backend/lambda/lambda_handler.py" "${PKG_DIR}/lambda_handler.py"

python3 - <<PY
import os, zipfile

out = r"""${OUT_ZIP}"""
root = r"""${PKG_DIR}"""
os.makedirs(os.path.dirname(out), exist_ok=True)

def should_skip(path: str) -> bool:
  p = path.replace(os.sep, "/")
  if "/__pycache__/" in p:
    return True
  if p.endswith((".pyc", ".pyo")):
    return True
  return False

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
  for base, _, files in os.walk(root):
    for name in files:
      full = os.path.join(base, name)
      if should_skip(full):
        continue
      rel = os.path.relpath(full, root)
      z.write(full, arcname=rel)
print("Wrote", out, f"({os.path.getsize(out)} bytes)")
PY

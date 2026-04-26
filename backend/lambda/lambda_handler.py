import json
import os
from typing import Any
from urllib.parse import quote_plus

import boto3


def _load_secrets_from_env() -> None:
  """Merge JSON secrets from AWS Secrets Manager into `os.environ` (before importing the app)."""
  secret_id = (os.environ.get("TALENTSTREAM_SECRETS_ID") or "").strip()
  if not secret_id:
    return

  client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION"))
  resp = client.get_secret_value(SecretId=secret_id)
  raw = (resp.get("SecretString") or "").strip()
  if not raw:
    return

  data = json.loads(raw)
  if not isinstance(data, dict):
    raise RuntimeError("App secret JSON must be an object at the top level.")

  for k, v in data.items():
    if v is None:
      continue
    if isinstance(v, (dict, list)):
      os.environ[str(k)] = json.dumps(v)
    else:
      os.environ[str(k)] = str(v)


def _apply_lambda_runtime_defaults() -> None:
  # Lambda has a read-only filesystem except /tmp. Local dev continues to use repo `.data/`.
  if (os.environ.get("TALENTSTREAM_AWS_LAMBDA") or "").strip() != "1":
    return
  os.environ.setdefault("UPLOAD_DIR", "/tmp/uploads")
  if (os.environ.get("DB_BACKEND") or "sqlite").strip().lower() == "postgres":
    return
  os.environ.setdefault("SQLITE_PATH", "/tmp/talentstreamai.sqlite3")


def _configure_aurora_database_url() -> None:
  """Build ``DATABASE_URL`` from Aurora (Secrets Manager + host env) before app import."""
  if (os.environ.get("DATABASE_URL") or "").strip():
    return
  arn = (os.environ.get("AURORA_SECRET_ARN") or "").strip()
  host = (os.environ.get("POSTGRES_HOST") or "").strip()
  user = (os.environ.get("POSTGRES_USER") or "").strip()
  db = (os.environ.get("POSTGRES_DB") or "talentstreamai").strip()
  port = (os.environ.get("POSTGRES_PORT") or "5432").strip()
  if not (arn and host and user):
    return
  client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION"))
  raw = (client.get_secret_value(SecretId=arn).get("SecretString") or "").strip()
  data = json.loads(raw) if raw else {}
  if not isinstance(data, dict) or "password" not in data:
    raise RuntimeError("Aurora secret must be a JSON object with a 'password' field")
  password = str(data["password"])
  user_final = str(data.get("username") or user)
  os.environ["DATABASE_URL"] = (
    f"postgresql://{quote_plus(user_final)}:{quote_plus(password)}@{host}:{port}/{db}"
  )
  os.environ.setdefault("DB_BACKEND", "postgres")


_load_secrets_from_env()
_apply_lambda_runtime_defaults()
_configure_aurora_database_url()

from mangum import Mangum  # noqa: E402  (import after env is prepared)

from app.main import app  # noqa: E402


handler: Any = Mangum(app, lifespan="off")


from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[3]
_ENV_FILE = _REPO_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    deployment_environment: str | None = None
    openai_api_key: str | None = None

    auth_mode: str = "clerk_jwks"
    clerk_jwks_url: str | None = None
    clerk_issuer: str | None = None
    clerk_audience: str | None = None

    max_upload_bytes: int = 5 * 1024 * 1024
    max_text_chars: int = 80_000
    max_output_chars: int = 120_000

    sqlite_path: str = ".data/talentstreamai.sqlite3"
    upload_dir: str = ".data/uploads"
    sqlite_busy_timeout_ms: int = 5000
    sqlite_enable_wal: bool = True

    upload_storage: str = "none"
    s3_bucket: str | None = None
    s3_prefix: str = "uploads/"
    s3_sse: str = "AES256"
    s3_kms_key_id: str | None = None

    agent_mode: str = "stub"
    llm_base_url: str = "https://api.openai.com"
    llm_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LLM_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"),
    )
    llm_model: str = "gpt-4.1-mini"
    llm_timeout_seconds: float = 45.0
    llm_max_tokens: int = 1800
    llm_temperature: float = 0.2
    openrouter_referer: str | None = None
    openrouter_title: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @field_validator("auth_mode", "agent_mode", "upload_storage", mode="before")
    @classmethod
    def _normalize_lower_modes(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("s3_sse", mode="before")
    @classmethod
    def _normalize_s3_sse(cls, value: str | None) -> str | None:
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        if normalized.lower() == "aes256":
            return "AES256"
        if normalized.lower() == "aws:kms":
            return "aws:kms"
        return normalized


settings = Settings()

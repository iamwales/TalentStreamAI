# TalentStreamAI API — architecture and operations

## Engineering principles

The API is **purpose-built** for the product: authenticated users manage a **base resume**, run **tailor** jobs against job URLs or pasted descriptions, and review **applications** with match analysis and deliverables. The design favors **modular services**, **clear boundaries** (HTTP → orchestration → LangGraph/LLM → persistence), and **operational visibility** from day one.

- **Code quality**: Typed Python, Pydantic at IO boundaries, small composable modules (`tailor_orchestrator`, `ingest_resume`, `job_text`, `draft_email`). Routers stay thin; business logic lives in `app/services/`.
- **Errors**: Domain issues surface as `HTTPException` with actionable `detail` strings. Unexpected failures return a **stable JSON body** with `errorId` (and `requestId` when the client sent `X-Request-Id`) for cross-referencing logs and support tickets. `RequestValidationError` and `HTTPException` keep their normal FastAPI behavior.
- **Logging**: **Structured logging** via `structlog` with per-request `request_id`, `user_id` (after auth), `http_path`, and `http_method` on the context. Set `LOG_JSON=true` in production to emit one JSON object per line for your log stack.
- **Metrics**: **Prometheus** text exposition at `GET /api/v1/metrics` (when `ENABLE_PROMETHEUS=true`, default on). Counters and histograms cover HTTP volume/latency, LLM invocations, token usage (when the provider returns `usage`), and tailor outcomes.
- **LLM observability**: The OpenAI-compatible client records **latency**, **token usage** (prompt/completion), and **heuristic safety flags** on raw text (e.g. bracket placeholders, suspicious length). These are logs + metrics, not a substitute for human review of applications.
- **Langfuse** (optional): Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` (or `LANGFUSE_HOST` / `langfuse_host`) in the repo root `.env`. Traces and generations show in the **Langfuse** project ([cloud](https://cloud.langfuse.com) / [US](https://us.cloud.langfuse.com)), not in the OpenAI or OpenRouter product UIs. The **httpx** `LlmClient` records each `chat.completions` call; tailor runs also open a parent span `tailor.run`, and the service **flushes** the Langfuse client after each tailor or generate stream so batches are visible without waiting for process exit. The **LangChain** `ChatOpenAI` path in `workflow.py` uses the Langfuse callback when configured. Use `LANGFUSE_TRACING_ENABLED=false` to turn tracing off without removing keys. Tracing does **not** use `OPENAI_API_KEY`—only the Langfuse keys. For **chat completions**, `Settings.chat_completions_api_key` uses `OPENROUTER_API_KEY` when set, otherwise `OPENAI_API_KEY` (OpenAI-only setups).
- **Traces and alerts**: The codebase is also **ready** for you to plug OpenTelemetry (e.g. export to your collector when `OTEL_EXPORTER_OTLP_ENDPOINT` is set) and to wire **alerting** on `5xx` rate, p95 latency, LLM error rate, and `tailor_runs_total{outcome="error"}`. The exact OTel exporter packages are left to your platform to avoid unused heavy dependencies in minimal installs.

## Data model (PostgreSQL — local Docker or Aurora in AWS)

- **`documents`**: Resume and job-description blobs (existing). Resume `meta` may include `title`, `is_base`, `application_id`.
- **`user_profiles`**: One row per Clerk `user_id` (or `anonymous` in dev), with `base_resume_id` and display fields.
- **`application_records`**: One row per tailor run, with `job_description` text, `match_score`, `status`, `cover_letter`, `resume_id` (tailored document), and a JSON `meta` payload for `gaps`, `match_analysis`, `draft_email`, and raw `gap_analysis`.

Migrations are **incremental** `CREATE TABLE IF NOT EXISTS` in `init_db()`. New tables appear on the next process start; no separate migration runner is required for the capstone.

**AWS (Lambda + Terraform)**: Terraform provisions **Aurora Serverless v2 (PostgreSQL)**; the Lambda build composes `DATABASE_URL` from the cluster endpoint and Secrets Manager before the app loads. The app always uses `psycopg` and one logical schema.

## API surface (frontend contract)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/profile` | User profile (camelCase JSON, aligned with Next.js types). |
| POST | `/api/v1/profile/base-resume` | Upload and set **base** resume. |
| GET | `/api/v1/dashboard/stats` | Aggregated counts and average match score. |
| GET | `/api/v1/applications` | List applications (job description may be truncated in list view). |
| GET | `/api/v1/applications/{id}` | Full application. |
| POST | `/api/v1/applications/tailor` | Run tailor pipeline; returns `TailorResponse` shape. |
| GET | `/api/v1/resumes` | List resumes. |
| GET | `/api/v1/resumes/{id}` | Full resume with `content`. |
| POST | `/api/v1/resumes` | Extra upload (does not set base unless profile flow is used). |
| GET | `/api/v1/health` | Liveness. |
| GET | `/api/v1/ready` | Readiness (DB ping). |
| GET | `/api/v1/metrics` | Prometheus scrape (optional off). |

Existing routes under `/api/v1/generate/stream` and job description helpers remain for streaming and internal workflows.

## Runtime configuration

See the repository root `.env.example` for `LOG_LEVEL`, `LOG_JSON`, `ENABLE_PROMETHEUS`, `SERVICE_NAME`, auth/LLM keys, and optional **Langfuse** variables. In **deployed** environments, startup checks still enforce `AUTH_MODE`, `AGENT_MODE`, and `UPLOAD_STORAGE` as in `app/main.py`.

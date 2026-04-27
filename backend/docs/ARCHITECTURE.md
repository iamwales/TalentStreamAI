# TalentStreamAI API — architecture and operations

**Related:** For the full **system** view (Next.js, LangGraph tailor graph, AWS, diagrams, and product flow), see the repository’s [**agentarchitecture.md**](../../agentarchitecture.md) next to this README. *This* document focuses on the **Python API**: patterns, data model, mounted routes, and operations.

---

## Engineering principles

The API is **purpose-built** for the product: authenticated users manage a **base resume**, run **tailor** jobs against job URLs or pasted descriptions, and review **applications** with match analysis and deliverables. The design favors **modular services**, **clear boundaries** (HTTP → orchestration → LangGraph/LLM → persistence), and **operational visibility** from day one.

- **Code quality**: Typed Python, Pydantic at IO boundaries, small composable modules (`tailor_orchestrator`, `ingest_resume`, `job_text`, `draft_email`). Routers stay thin; business logic lives in `app/services/`.
- **Errors**: Domain issues surface as `HTTPException` with actionable `detail` strings. Unexpected failures return a **stable JSON body** with `errorId` (and `requestId` when the client sent `X-Request-Id`) for cross-referencing logs and support tickets. `RequestValidationError` and `HTTPException` keep their normal FastAPI behavior.
- **Logging**: **Structured logging** via `structlog` with per-request `request_id`, `user_id` (after auth), `http_path`, and `http_method` on the context. Set `LOG_JSON=true` in production to emit one JSON object per line for your log stack.
- **Metrics**: **Prometheus** text exposition at `GET /api/v1/metrics` (when `ENABLE_PROMETHEUS=true`, default on). Counters and histograms cover HTTP volume/latency, LLM invocations, token usage (when the provider returns `usage`), and tailor outcomes.
- **LLM observability**: The OpenAI-compatible client records **latency**, **token usage** (prompt/completion), and **heuristic safety flags** on raw text (e.g. bracket placeholders, suspicious length). These are logs + metrics, not a substitute for human review of applications.
- **Langfuse** (optional): Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` (or `LANGFUSE_HOST` / `langfuse_host`) in the repo root `.env` (in AWS, add the same keys to the app secret JSON loaded by `lambda_handler`). Traces and generations show in the **Langfuse** project, not in the OpenAI or OpenRouter product UIs. The `LlmClient` path uses the Langfuse **OpenAI** integration when a tracing client exists; tailor runs also open a parent span `tailor.run`. The service **flushes** Langfuse after tailor runs and generation streams; in **Lambda** (Mangum `lifespan="off"`) the app also flushes after responses so batched events are not stranded. The **LangChain** `ChatOpenAI` path in `workflow.py` uses the Langfuse callback when configured. Use `LANGFUSE_TRACING_ENABLED=false` to turn tracing off without removing keys. Tracing does **not** use `OPENAI_API_KEY` for Langfuse—only the Langfuse keys. For **chat completions**, `Settings.chat_completions_api_key` uses `OPENROUTER_API_KEY` when set, otherwise `OPENAI_API_KEY`.
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
| GET | `/api/v1/auth/me` | Auth probe (Clerk). |
| POST | `/api/v1/job-descriptions` | Create stored job description document. |
| GET | `/api/v1/job-descriptions/{id}` | Fetch job description by id. |
| POST | `/api/v1/generate/stream` | SSE stream over the same tailor graph (optional UX). |
| POST | `/api/v1/generate/with-missing-skills` | Variant graph (analyze + resume only). |
| GET | `/api/v1/health` | Liveness. |
| GET | `/api/v1/ready` | Readiness (DB ping). |
| GET | `/api/v1/metrics` | Prometheus scrape (optional off). |

`app/api/v1/endpoints.py` (file-upload `/apply`, `/fetch-job`, etc.) is a **legacy** module and is not mounted on the default `api_router` — the product path is **applications/tailor** with a stored base resume.

## Runtime configuration

See the repository root `.env.example` for `LOG_LEVEL`, `LOG_JSON`, `ENABLE_PROMETHEUS`, `SERVICE_NAME`, auth/LLM keys, and optional **Langfuse** variables. In **deployed** environments, startup checks still enforce `AUTH_MODE`, `AGENT_MODE`, and `UPLOAD_STORAGE` as in `app/main.py`.

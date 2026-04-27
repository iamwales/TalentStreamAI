# TalentStreamAI

Squad Five capstone for the Andela AI Engineering Bootcamp. The goal is straightforward on paper: help a candidate move from “I found a role” to “I submitted strong materials” without burning an afternoon on manual rewrites. This repository is the **scaffold** only—FastAPI for the API surface, a static-export Next.js client, and a **Terraform root** that is intentionally empty except for provider wiring, variables, outputs, and comments that describe the AWS shape you are heading toward (Aurora Serverless v2 + Data API, Secrets Manager, ECS or Lambda for LangGraph/OpenRouter, API Gateway + Clerk JWT, CloudFront in front of S3). Implementers add resources when they are ready.

Product direction (for context while you build):

- Ingest a resume plus a job posting URL.
 - Diff the candidate's story against the role (ATS-oriented gap analysis).
 - Generate refreshed resume copy, a cover letter with narrative structure, and a Gmail-ready draft.

## Implementation Status

The backend is now fully implemented with a LangGraph-based workflow for generating job application materials.

### API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/v1/apply` | POST | Run the complete TalentStreamAI workflow |
| `/api/v1/fetch-job` | POST | Fetch and parse a job description from URL |
| `/api/v1/parse-resume` | POST | Parse a resume file (PDF or DOCX) |
| `/api/v1/score-ats` | POST | Score resume against job description for ATS compatibility |

#### Apply Endpoint (Main)

The main `/api/v1/apply` endpoint accepts:
- `job_url` (str): URL of the job posting
- `resume` (UploadFile): Resume file (PDF or DOCX)

Returns job data, resume data, ATS score, gap analysis, tailored resume, cover letter, and email draft.

### LangGraph Workflow

The workflow consists of these nodes executed in sequence:

1. **fetch_job**: Fetches job description from URL using web scraping
2. **parse_resume**: Parses PDF/DOCX resume into structured data
3. **score_ats**: Scores resume against job requirements
4. **analyze_gaps**: Identifies keyword and skill gaps
5. **generate_resume**: Generates ATS-optimized tailored resume (LLM)
6. **generate_cover_letter**: Generates narrative cover letter (LLM)
7. **generate_email**: Generates Gmail-ready email draft (LLM)

### Tools

Located in `backend/app/tools/`:
- **job_fetcher.py**: Fetches and parses job descriptions from URLs
- **resume_parser.py**: Parses PDF and DOCX resumes
- **ats_scorer.py**: Scores resumes against job requirements for ATS compatibility
- **models.py**: Pydantic models for all tool inputs and outputs

### Environment Variables

Required in `.env`:
| Key | Description |
| --- | --- |
| `DATABASE_URL` | `postgresql://…` — e.g. local Docker Postgres or a dev Aurora tunnel. |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | At least one for `AGENT_MODE=llm`: OpenRouter for chat if set, else `OPENAI_API_KEY` (see `.env.example`). |
| `LANGFUSE_*` | Optional: Langfuse keys for API-side LLM observability (see `.env.example`). |

## Prerequisites

Pick what matches how you work day to day:

- **Docker Desktop** (or Docker Engine) plus the Compose plugin for the one-command local stack.
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** for installing and running the Python service (lockfile-backed).
- **Python 3.12** (`backend/.python-version` helps pyenv/asdf) and **Node.js 22** (e.g. 22.9; see `frontend/.nvmrc`) for host-only development.
- **Terraform 1.6+** and the **AWS CLI v2** when you touch AWS resources.
- An **AWS account** with credentials (`AWS_PROFILE` or standard access keys) when running Terraform or deploy workflows locally.

Secrets stay out of git. Copy `.env.example` at the **repository root** to `.env` and fill in values for your machine. Deployed environments should load the same keys from your secret manager or GitHub Actions secrets/variables.

## First-time local setup (without Docker)

You need a **PostgreSQL** instance and `DATABASE_URL` in the repo root `.env` (see `.env.example`).

```bash
cp .env.example .env   # set DATABASE_URL to e.g. postgresql://user:pass@127.0.0.1:5432/talentstreamai
cd backend && uv sync && cd ../frontend && npm install
```

Start each service in its own terminal:

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` for the UI and `http://localhost:8000/docs` for OpenAPI. The home page calls `/api/v1/health` so you can confirm both halves are talking.

### Environment variables (repo root `.env`)

Both FastAPI (`pydantic-settings`) and Next.js (via `dotenv-cli` in `frontend/package.json` scripts) read from the **same** `.env` at the repository root. Keep per-environment values out of source code—set them here locally, or inject them in CI/CD.

| Key | Consumers | Purpose |
| --- | --- | --- |
| `API_HOST` | API | Bind address inside the container or host. |
| `API_PORT` | API | Port for Uvicorn when you run it manually. |
| `CORS_ORIGINS` | API | Comma-separated browser origins allowed to call the API. |
| `DATABASE_URL` | API | **Required.** `postgresql://…` to your Postgres (Docker Compose provides one; in AWS, Lambda gets this from Aurora via `lambda_handler`). |
| `NEXT_PUBLIC_API_URL` | UI (build + browser) | Public API base URL the browser calls. Leave empty for production builds that should call same-origin `/api/*` through CloudFront. |
| `DEPLOYMENT_ENVIRONMENT` | API (`/api/v1/health` metadata) | Optional label such as `local`, `dev`, `staging`, or `prod`. |
| `OPENROUTER_API_KEY` | API | OpenRouter key; used for chat when set (with `LLM_BASE_URL` for OpenRouter). |
| `OPENAI_API_KEY` | API | Used for chat when `OPENROUTER_API_KEY` is unset; optional when OpenRouter is set. |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | API | Optional. [Langfuse](https://langfuse.com) project keys for LLM tracing; set with `LANGFUSE_BASE_URL` (or `LANGFUSE_HOST`) for EU/US/self-hosted. |

## Run the full stack in Docker

```bash
cp .env.example .env   # optional; Compose can substitute from this file
docker compose up --build
```

- Postgres on `localhost:5432` and API on `http://localhost:8000`
- UI on `http://localhost:3000` (**`next dev`** inside Compose — hot reload, not a production `next build`)
- **Why the first run can feel slow:** the first `docker compose up --build` pulls image layers, runs `uv sync` in the backend image, and runs **`npm ci`** when building the frontend. After that, the UI is **`next dev`**. If you change **`package-lock.json`**, run `docker compose build frontend` (or `docker compose up --build`) again.

Stop the stack with `docker compose down` in the same directory.

## Terraform (root under `terraform/`)

`main.tf` includes an **S3** `backend "s3" {}` placeholder; the **deploy** and **destroy** shell scripts (and GitHub Actions) pass `-backend-config` to `terraform init` so the same layout works locally and in CI. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in at least `clerk_*` and your app secrets. Nothing in the application code hardcodes an environment name; the `environment` variable in Terraform is `dev`, `staging`, or `prod`.

- **One-shot apply + frontend upload:** from this folder (`TalentStreamAI/`), `./scripts/deploy.sh <dev|staging|prod> [project_name]`
- **Destroy one environment:** `./scripts/destroy.sh <dev|staging|prod> [project_name]`

The first time you use **remote** state, you may need a one-time `terraform init -reconfigure -backend=false` and apply so the state bucket and lock table exist, then **migrate** state to S3 using the same backend values as the scripts. Full steps and the **list of GitHub secrets** to set in the repository are in the **[root `README.md`](../README.md)**.

## Project structure

Repository root **`TalentStreamAI/`** 

```text
TalentStreamAI/
├── backend/                         # FastAPI API (uv / pyproject.toml)
│   ├── app/
│   │   ├── main.py                  # App factory + CORS + router mount
│   │   ├── api/                     # HTTP routers (e.g. v1/health)
│   │   ├── core/                    # Settings (reads repo-root .env)
│   │   └── services/
│   │       └── langgraph/           # Placeholder for agent graphs / tools
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/                        # Next.js 15 (App Router, static export)
│   ├── src/
│   │   ├── app/                     # Routes, layouts, pages
│   │   └── lib/                     # Shared helpers (e.g. API URL builder)
│   ├── public/                      # Static assets for export
│   ├── Dockerfile                   # Local `next dev` in Docker (used by Compose)
│   ├── next.config.ts
│   └── package.json
├── terraform/                       # AWS scaffold (no resources yet)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   ├── aurora.tf
│   ├── terraform_state.tf
│   ├── terraform.tfvars.example
│   └── .terraform.lock.hcl
├── scripts/
│   ├── deploy.sh                    # Lambda pack + terraform apply + Next export → S3 + invalidation
│   └── destroy.sh                    # empty app buckets + terraform destroy
├── .github/
│   ├── workflows/                   # deploy + destroy
│   └── aws/
│       └── github-oidc-trust-policy.json.example
├── docker-compose.yml               # Local API (:8000) + Next dev server (:3000)
├── .env.example                     # Shared env template (copy to repo-root .env)
├── .gitignore
└── README.md
```

## GitHub Actions

- **`deploy.yml`:** on **push to `main`** (deploys **dev**) or **workflow_dispatch** to pick **dev** / **staging** / **prod**; calls `scripts/deploy.sh` with OIDC.
- **`destroy.yml`:** **workflow_dispatch** only, with a typed confirmation, calling `scripts/destroy.sh`.

Details and the **expected repository secrets and environments** are in the **[root deployment guide](../README.md)**. For a trust policy template for the IAM role GitHub will assume, see **`.github/aws/github-oidc-trust-policy.json.example`** and substitute your account, org, and repository.

## Where feature work should land

- **FastAPI routers**: add packages under `backend/app/api/v1/` (or new version folders) and include them from `backend/app/api/router.py`.
- **Agents / LangGraph**: keep graphs, tools, and state machines under `backend/app/services/langgraph/` so onboarding stays predictable.
- **UI routes and data fetching**: colocate routes in `frontend/src/app` (static export friendly) and keep shared helpers in `frontend/src/lib`.
- **Infrastructure growth**: add child modules under `terraform/modules/` (or keep everything flat) and call them from `terraform/main.tf` once you outgrow the four-file scaffold.

## Quality gates (lightweight for now)

```bash
cd frontend && npm run lint && npm run build
```

```bash
cd backend && uv sync && uv run python -m compileall -q app
```

Add pytest, Ruff, or mypy when the API surface grows; the scaffold stays intentionally small.

## Troubleshooting quick hits

- **UI shows “Backend not responding.”** Confirm Uvicorn is listening on `8000`, `CORS_ORIGINS` includes your UI origin, and `NEXT_PUBLIC_API_URL` matches how your browser reaches the API.
- **`docker compose` cannot reach Docker.** Start Docker Desktop (macOS/Windows) or the Linux daemon, then from this directory run `docker compose up --build`.
- **`http://localhost:3000` does nothing.** Confirm the frontend container is up (`docker compose ps`) and check `docker compose logs frontend`. If **`docker compose build frontend`** fails or the container exits with **137**, raise **Memory** in Docker Desktop (Settings → Resources), then rebuild. After **`package-lock.json`** changes, run `docker compose build frontend` (or `docker compose up --build`) again.
- **Terraform init in CI** fails (missing state bucket, etc.): do the [first-time remote state and migrate step](../README.md#first-time-s3-state-backend-and-github) from your machine.

For **deployment and GitHub settings**, use the **[root `README.md`](../README.md)**.

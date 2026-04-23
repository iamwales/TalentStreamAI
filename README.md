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
| `OPENAI_API_KEY` | OpenAI API key for LLM calls (GPT-4o) |

## Prerequisites

Pick what matches how you work day to day:

- **Docker Desktop** (or Docker Engine) plus the Compose plugin for the one-command local stack.
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** for installing and running the Python service (lockfile-backed).
- **Python 3.12** (`backend/.python-version` helps pyenv/asdf) and **Node.js 20+** for host-only development.
- **Terraform 1.6+** and the **AWS CLI v2** when you touch AWS resources.
- An **AWS account** with credentials (`AWS_PROFILE` or standard access keys) when running Terraform or deploy workflows locally.

Secrets stay out of git. Copy `.env.example` at the **repository root** to `.env` and fill in values for your machine. Deployed environments should load the same keys from your secret manager or GitHub Actions secrets/variables.

## First-time local setup (without Docker)

```bash
chmod +x scripts/*.sh   # first clone only
cp .env.example .env    # optional but recommended
./scripts/bootstrap-local.sh
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
| `NEXT_PUBLIC_API_URL` | UI (build + browser) | Public API base URL the browser calls. Leave empty for production builds that should call same-origin `/api/*` through CloudFront. |
| `DEPLOYMENT_ENVIRONMENT` | API (`/api/v1/health` metadata) | Optional label such as `local`, `dev`, `staging`, or `prod`. |
| `OPENAI_API_KEY` | API | OpenAI API key for LLM calls (GPT-4o). Required for `/api/v1/apply` endpoint. |

## Run the full stack in Docker

```bash
chmod +x scripts/*.sh   # first clone only
cp .env.example .env      # optional; run.sh exports it for Compose variable substitution
./scripts/run.sh
```

- API on `http://localhost:8000`
- UI on `http://localhost:3000` (**`next dev`** inside Compose — hot reload, not a production `next build`)
- **Why the first run can feel slow:** `./scripts/run.sh` runs `docker compose up --build`. The backend image pulls base layers and runs `uv sync` once; the frontend image runs **`npm ci`** during **`docker compose build`**. After that, Compose just starts the container; the UI is **`next dev`** from `frontend/Dockerfile`. To pick up new frontend dependencies after you edit **`package-lock.json`**, run `docker compose build frontend` (or `docker compose up --build`) again.

Stop everything with `./scripts/stop.sh`.

## Terraform (single root under `terraform/`)

The Terraform root now provisions:

- GitHub Actions OIDC provider, deploy role, trust policy, and deploy permissions.
- Frontend edge stack: private S3 bucket, CloudFront OAC, CloudFront distribution.
- Backend edge stack: API Gateway HTTP API with Clerk JWT authorizer, Lambda function + IAM role, CloudWatch logs.
- CloudFront `/api/*` behavior forwarding to API Gateway while static files come from S3.

`variables.tf` contains all deployment knobs (GitHub repo identity, state ARNs, Clerk issuer/audience, Lambda environment maps, optional secret ARNs, and custom domain settings).

### Remote state

The `terraform {}` block declares an **S3 backend** (empty configuration). Every `terraform init` needs either:

- `terraform/backend.hcl` (copy `terraform/backend.hcl.example`), or
- `TALENTSTREAM_USE_LOCAL_TF_STATE=1` with `python3 scripts/deploy_aws.py` for disposable local state (not for teams).

### Provision / destroy helpers

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# set required variables (github_org, github_repo, frontend_bucket_name, Clerk settings, state ARNs, etc.)
```

From the repository root:

```bash
python3 scripts/bootstrap_tf_state.py <bucket> <lock-table> us-east-1
python3 scripts/setup_github_oidc.py --environment dev
python3 scripts/terraform_provision.py --environment dev
```

`python3 scripts/destroy_aws.py` runs `terraform destroy` for an environment after confirmation.

## Packaging and deploy scripts

Independent scripts are provided for prep, provision, and upload so frontend and backend can be deployed separately or together:

```bash
# Frontend
python3 scripts/prep_frontend.py
python3 scripts/upload_frontend.py
python3 scripts/deploy_frontend.py --environment dev

# Backend Lambda
python3 scripts/prep_backend_lambda.py
python3 scripts/upload_backend_lambda.py
python3 scripts/deploy_backend.py --environment dev

# Full orchestration
python3 scripts/deploy_all.py --environment dev
```

Each deploy script supports partial flows (for example `--skip-prep`, `--skip-tf`, `--provision-only`, or `--upload-only`).

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
├── terraform/                       # AWS IaC root (OIDC + S3/CloudFront + API GW/Lambda)
│   ├── main.tf                      # Core AWS resources and IAM policies
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   ├── backend.hcl.example
│   ├── terraform.tfvars.example
│   └── .terraform.lock.hcl
├── scripts/
│   ├── bootstrap-local.sh           # uv sync + npm install
│   ├── run.sh / stop.sh             # Docker Compose up / down
│   ├── bootstrap_tf_state.py        # One-time S3 + DynamoDB remote state bootstrap
│   ├── setup_github_oidc.py         # One-time OIDC provider + deploy role bootstrap
│   ├── terraform_provision.py       # terraform init/plan/apply wrapper
│   ├── prep_frontend.py / upload_frontend.py / deploy_frontend.py
│   ├── prep_backend_lambda.py / upload_backend_lambda.py / deploy_backend.py
│   ├── deploy_all.py                # One command for frontend + backend
│   └── destroy_aws.py               # Terraform destroy helper
├── .github/
│   ├── workflows/                   # CI + deploy placeholder workflows
│   └── aws/
│       └── github-oidc-trust-policy.json.example
├── docker-compose.yml               # Local API (:8000) + Next dev server (:3000)
├── .env.example                     # Shared env template (copy to repo-root .env)
├── .gitignore
└── README.md
```

## GitHub Actions

`.github/workflows/ci.yml` now runs:

- frontend lint + static build,
- backend Lambda packaging check,
- Terraform fmt/init(validate with local backend disabled).

`.github/workflows/deploy-aws.yml` is a manual workflow with targets (`oidc`, `frontend`, `backend`, `all`) that:

- assumes AWS with GitHub OIDC,
- generates backend.hcl and terraform.tfvars from repository/environment variables,
- runs the same deploy scripts used locally.

For OIDC trust policy shaping, see `.github/aws/github-oidc-trust-policy.json.example`.

### Required GitHub variables

At minimum, configure these repository or environment variables before running deploy workflow:

- `AWS_ROLE_ARN`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `TF_STATE_BUCKET`
- `TF_STATE_LOCK_TABLE`
- `GITHUB_ORG`
- `GITHUB_REPO`
- `FRONTEND_BUCKET_NAME`
- `CLERK_JWT_ISSUER`
- `CLERK_JWT_AUDIENCE`
- `CORS_ORIGINS`

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

## Lambda runtime note

FastAPI is exposed to Lambda via `backend/app/lambda_handler.py` using Mangum. `scripts/prep_backend_lambda.py` builds a zip artifact at `dist/backend-lambda.zip` including app code and Lambda dependencies.

## Troubleshooting quick hits

- **UI shows “Backend not responding.”** Confirm Uvicorn is listening on `8000`, `CORS_ORIGINS` includes your UI origin, and `NEXT_PUBLIC_API_URL` matches how your browser reaches the API.
- **`docker compose` cannot reach Docker.** Start Docker Desktop (macOS/Windows) or the Linux daemon, then rerun `./scripts/run.sh`.
- **`http://localhost:3000` does nothing.** Confirm the frontend container is up (`docker compose ps`) and check `docker compose logs frontend`. If **`docker compose build frontend`** fails or the container exits with **137**, raise **Memory** in Docker Desktop (Settings → Resources), then rebuild. After **`package-lock.json`** changes, run `docker compose build frontend` (or `./scripts/run.sh` with `--build`) again.
- **Terraform init asks for backend settings.** Create `terraform/backend.hcl` or export `TALENTSTREAM_USE_LOCAL_TF_STATE=1` for disposable local state.
- **Deploy workflow fails before Terraform apply.** Confirm GitHub repository/environment variables include state bucket/table, role ARN, Clerk issuer/audience, and frontend bucket name.



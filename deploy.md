# Deployment Guide

This document is a comprehensive step-by-step walkthrough for deploying TalentStreamAI infrastructure and application artifacts on AWS using Terraform, Python deployment scripts, and GitHub Actions OIDC.

The deployment model in this repository is:

- Frontend: static Next.js export -> S3 (private) -> CloudFront
- Backend: FastAPI (Mangum) -> Lambda -> API Gateway HTTP API
- Edge routing: CloudFront `/*` -> S3, CloudFront `/api/*` -> API Gateway
- CI/CD auth: GitHub Actions assumes an AWS IAM role through OIDC (no long-lived AWS keys required)

---

## 1) Prerequisites

Install these tools locally:

- Python 3.12+
- Node.js 20+
- Terraform 1.6+
- AWS CLI v2

Configure AWS credentials for local bootstrap/deployment:

```bash
aws configure
aws sts get-caller-identity
```

You should also have:

- An AWS account and region selected (`us-east-1` by default)
- A GitHub repository for this project
- Clerk issuer/audience values ready for API Gateway JWT authorizer

---

## 2) Understand deployment scripts

Core Python scripts are in `scripts/`:

- `bootstrap_tf_state.py`: one-time S3 + DynamoDB bootstrap for Terraform state
- `setup_github_oidc.py`: one-time OIDC provider + IAM deploy role bootstrap
- `terraform_provision.py`: Terraform init/validate/plan/apply
- `prep_frontend.py`: builds frontend static export (`frontend/out`)
- `upload_frontend.py`: uploads `frontend/out` to S3 + CloudFront invalidation
- `prep_backend_lambda.py`: packages backend zip (`dist/backend-lambda.zip`)
- `upload_backend_lambda.py`: updates Lambda code
- `deploy_frontend.py`: prep -> provision -> upload for frontend
- `deploy_backend.py`: prep -> provision -> upload for backend
- `deploy_all.py`: frontend deploy then backend deploy

Shell files (`*.sh`) exist as compatibility wrappers and delegate to Python.

---

## 3) One-time Terraform remote state bootstrap

Run once per AWS account/region:

```bash
python3 scripts/bootstrap_tf_state.py <state-bucket-name> <lock-table-name> <region>
```

Example:

```bash
python3 scripts/bootstrap_tf_state.py talentstreamai-tf-state terraform-locks us-east-1
```

Then create `terraform/backend.hcl` (gitignored):

```hcl
bucket         = "talentstreamai-tf-state"
key            = "talentstreamai/dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
```

---

## 4) Configure Terraform variables

Copy the example file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit required values in `terraform/terraform.tfvars`:

- `github_org`
- `github_repo`
- `frontend_bucket_name` (globally unique S3 bucket name)
- `clerk_jwt_issuer`
- `clerk_jwt_audiences`
- `cors_origins` (set to your CloudFront/custom domain URL)
- `state_bucket_arn`
- `state_bucket_objects_arn`
- `state_lock_table_arn`

Optional but recommended:

- `cloudfront_aliases`, `cloudfront_acm_certificate_arn`, `route53_zone_id` (custom domain)
- `lambda_environment` map for non-secret runtime config
- `lambda_secret_arns` if using pre-existing Secrets Manager secrets

---

## 5) Bootstrap GitHub OIDC deploy role (one-time)

This step creates/updates:

- `aws_iam_openid_connect_provider` (unless disabled via tfvars)
- GitHub deploy IAM role
- Deploy role policy attachment

Run:

```bash
python3 scripts/setup_github_oidc.py --environment dev
```

Capture output:

- `github_actions_role_arn`

Use it as your GitHub `AWS_ROLE_ARN` variable.

---

## 6) Local deployment flows

## 6.1 Full deploy (frontend + backend)

```bash
python3 scripts/deploy_all.py --environment dev
```

This does:

1. Frontend prep/build
2. Terraform provision/apply
3. Frontend upload and CloudFront invalidation
4. Backend package
5. Backend Lambda code upload

Note: Backend deploy is invoked with `--skip-tf` inside `deploy_all.py` to avoid duplicate apply.

## 6.2 Frontend only

```bash
python3 scripts/deploy_frontend.py --environment dev
```

## 6.3 Backend only

```bash
python3 scripts/deploy_backend.py --environment dev
```

## 6.4 Partial deploy options

Both frontend and backend deploy scripts support:

- `--skip-prep` (reuse existing artifact)
- `--skip-tf` (skip Terraform apply)
- `--provision-only` (apply infra only)
- `--upload-only` (artifact upload only; implies skip prep + skip tf)

Examples:

```bash
python3 scripts/deploy_frontend.py --environment dev --provision-only
python3 scripts/deploy_backend.py --environment dev --upload-only
```

---

## 7) GitHub Actions deployment

Workflow file: `.github/workflows/deploy-aws.yml`  
Trigger: manual (`workflow_dispatch`) with:

- `environment`: `dev|staging|prod`
- `target`: `oidc|frontend|backend|all`

### 7.1 Required GitHub variables

Set these repository/environment variables:

- `AWS_ROLE_ARN`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `TF_STATE_BUCKET`
- `TF_STATE_LOCK_TABLE`
- `TF_STATE_KEY_PREFIX` (optional, defaults to `talentstreamai`)
- `TF_PROJECT_NAME` (optional)
- `GITHUB_ORG`
- `GITHUB_REPO`
- `FRONTEND_BUCKET_NAME`
- `CLERK_JWT_ISSUER`
- `CLERK_JWT_AUDIENCE`
- `CORS_ORIGINS`
- `TF_CREATE_OIDC_PROVIDER` (optional)
- `TF_EXISTING_OIDC_PROVIDER_ARN` (optional)
- `TF_DEPLOY_ROLE_NAME` (optional)
- `CLOUDFRONT_ACM_CERTIFICATE_ARN` (optional)
- `ROUTE53_ZONE_ID` (optional)
- `LAMBDA_FUNCTION_NAME` (optional)
- `APP_CONFIG_SECRET_NAME` (optional)

### 7.2 Run the workflow

From GitHub UI:

1. Go to Actions -> `Deploy AWS`
2. Click `Run workflow`
3. Pick environment (`dev`, `staging`, `prod`)
4. Pick target:
   - `oidc`: bootstrap OIDC role only
   - `frontend`: deploy frontend only
   - `backend`: deploy backend only
   - `all`: full deploy

The workflow generates `terraform/backend.hcl` and `terraform/terraform.tfvars` dynamically from those variables, then runs the same Python scripts used locally.

---

## 8) Secrets and environment variable strategy

## 8.1 Lambda runtime env

Non-secrets:

- Use Terraform vars and `lambda_environment`
- Examples: `DEPLOYMENT_ENVIRONMENT`, logging flags, feature toggles

Secrets:

- Store secret values in AWS Secrets Manager (not in git, not in tfvars)
- Provide secret ARNs via `lambda_secret_arns` and/or use generated `app_config_secret_arn`
- Lambda role already supports `secretsmanager:GetSecretValue` for configured ARNs

## 8.2 Frontend env

Frontend is static export; env values are baked at build time.

- `NEXT_PUBLIC_API_URL` defaults to empty for same-origin `/api/*`
- Set `NEXT_PUBLIC_*` values in CI environment if needed at build time

---

## 9) Verify deployment

After successful apply/deploy:

```bash
cd terraform
terraform output cloudfront_domain_name
terraform output api_gateway_endpoint
terraform output frontend_bucket_name
terraform output lambda_function_name
```

Check:

- CloudFront URL loads frontend
- `/api/v1/health` works via CloudFront path routing
- Lambda logs appear in CloudWatch log group

---

## 10) Destroy resources

Interactive destroy:

```bash
python3 scripts/destroy_aws.py dev
```

Non-interactive:

```bash
python3 scripts/destroy_aws.py dev --yes
```

---

## 11) Common issues and fixes

- **`terraform init` fails on backend config**  
  Ensure `terraform/backend.hcl` exists or set `TALENTSTREAM_USE_LOCAL_TF_STATE=1` for disposable local state.

- **OIDC assume role fails in GitHub Actions**  
  Confirm trust policy matches repo/ref patterns and `AWS_ROLE_ARN` is correct.

- **CloudFront serves frontend but API fails**  
  Verify CloudFront `/api/*` behavior exists, API Gateway routes are present, and Clerk issuer/audience values are correct.

- **Lambda code updated but env change not reflected**  
  Run Terraform apply; env/config changes are not applied by `update-function-code` alone.

- **Frontend points to wrong API**  
  Ensure `NEXT_PUBLIC_API_URL` behavior is intentional (empty = same-origin `/api/*`).

---

## 12) Recommended rollout order per environment

For each new environment (`dev`, `staging`, `prod`):

1. Bootstrap remote state once (if not already done)
2. Configure env-specific `terraform/backend.hcl` key path
3. Prepare `terraform.tfvars` values for that environment
4. Run `python3 scripts/setup_github_oidc.py --environment <env>` if needed
5. Run `python3 scripts/deploy_all.py --environment <env>`
6. Verify outputs and health endpoint

This keeps the same tooling and sequence for local and CI/CD deployments.

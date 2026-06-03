# Frontend Deployment (S3 + CloudFront)

The frontend is deployed to AWS S3 + CloudFront via Terraform and GitHub Actions.

## Infrastructure

Terraform configuration lives in `infra/terraform/`.

| File | Purpose |
|------|---------|
| `main.tf` | S3 bucket, CloudFront distribution, OAC |
| `variables.tf` | Input variables |
| `outputs.tf` | Bucket name, CloudFront domain and ID |
| `envs/staging.tfvars` | Staging environment values |
| `envs/production.tfvars` | Production environment values |

## First-time Setup

```bash
cd infra/terraform

# Staging
terraform init
terraform apply -var-file=envs/staging.tfvars

# Production
terraform apply -var-file=envs/production.tfvars
```

Record the outputs and add them as GitHub secrets/variables:

| Output | GitHub secret/variable |
|--------|----------------------|
| `s3_bucket` | `S3_BUCKET` |
| `cloudfront_distribution_id` | `CLOUDFRONT_DISTRIBUTION_ID` |

Also set:
- `AWS_DEPLOY_ROLE_ARN` — IAM role ARN with S3 write + CloudFront invalidation permissions
- `GOVERNANCE_CONTRACT_ID` (variable) — deployed governance contract ID
- `TOKEN_CONTRACT_ID` (variable) — deployed token contract ID
- `STELLAR_RPC_URL` (variable) — RPC endpoint

## Environment Config Injection

Vite reads environment variables prefixed with `VITE_` at build time. The CI workflow injects:

```
VITE_GOVERNANCE_CONTRACT_ID
VITE_TOKEN_CONTRACT_ID
VITE_STELLAR_NETWORK
VITE_STELLAR_RPC_URL
```

Use them in the frontend via `import.meta.env.VITE_*`.

## CI/CD

The `.github/workflows/deploy-frontend.yml` workflow triggers on pushes to `main` that touch `frontend/` or `infra/terraform/`. It:

1. Builds the frontend with environment-specific config
2. Syncs the `dist/` output to S3 (immutable cache for assets, no-cache for `index.html`)
3. Invalidates the CloudFront distribution

## Manual Deploy

```bash
cd frontend
VITE_GOVERNANCE_CONTRACT_ID=<id> \
VITE_TOKEN_CONTRACT_ID=<id> \
VITE_STELLAR_NETWORK=mainnet \
npm run build

aws s3 sync dist/ s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

# Secret Management

## Core Rules

- **Never commit secrets** — private keys, tokens, passwords, and API keys must not appear in source code or git history.
- Use `.gitignore` to exclude `.env` and credential files. See `.env.example` for the list of required variables.
- Rotate any secret that has been accidentally committed immediately.

## Environment Variables

Copy `.env.example` to `.env` and populate locally:

```bash
cp .env.example .env
```

`.env` is git-ignored. Never commit it. Required variables:

| Variable | Purpose |
|---|---|
| `STELLAR_SECRET_KEY` | Signing key for deployments |
| `STELLAR_RPC_URL` | Network RPC endpoint |
| `GOVERNANCE_CONTRACT_ID` | Deployed governance contract |
| `TOKEN_CONTRACT_ID` | Deployed token contract |

## CI / GitHub Actions

Store all secrets in **GitHub Secrets** (Settings → Secrets and variables → Actions), not in workflow files or committed configs.

Reference them in workflows as `${{ secrets.SECRET_NAME }}`. Never `echo` secret values in logs.

## Service Account Keys

- Generate dedicated service accounts with the minimum required permissions.
- Store keys exclusively in GitHub Secrets or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).
- Rotate keys on a schedule (recommend: 90 days) and immediately after any team member departure.
- Delete unused keys promptly.

## Secret Scanning

A `secret-scan` CI job runs on every push and pull request to detect common secret patterns (private key headers, Stellar secret keys starting with `S`, hardcoded tokens). See `.github/workflows/ci.yml`.

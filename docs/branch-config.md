**Branch Config**

This project supports branch-specific environment flags to make deployments
and feature toggles safe and predictable per-branch.

Conventions
- Create branch-specific env files at the repository root named `.env.<branch>`
  (example: `.env/main`, `.env/feature/my-new-flag`).
- These files may contain non-sensitive defaults and feature flags. DO NOT
  commit private keys or secrets; store secrets in CI provider secret stores.

How it works
- `scripts/deploy.sh` will:
  - accept `--branch <name>` to explicitly select a branch env file
  - detect `GITHUB_REF` in CI or use `git rev-parse --abbrev-ref HEAD` locally
  - if `.env.<branch>` exists, source it before falling back to `.env`
  - branch-specific values override defaults from `.env`

Usage
- Local (use current git branch):
  ```bash
  ./scripts/deploy.sh
  ```
- Local (explicit branch):
  ```bash
  ./scripts/deploy.sh --branch feature/my-new-flag
  ```
- CI (GitHub Actions): ensure `GITHUB_REF` is available (normal), and create
  a `.env.<branch>` file containing non-sensitive defaults in the workflow
  workspace if needed, or set required values via GitHub Secrets.

Recommendations
- Keep `config/mainnet.toml`, `config/testnet.toml`, and `config/local.toml`
  as canonical network config files for operational use; use `.env.<branch>`
  for branch-scoped overrides and feature flags.
- Never commit private keys or credentials in branch env files. Use CI secrets
  for protected values and provide `.env.example` documenting required keys.

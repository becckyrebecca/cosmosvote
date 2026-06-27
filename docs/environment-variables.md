# Environment Variables & Secret Injection

This document covers every environment variable used by CosmosVote — scripts, deployment, and the frontend — with examples for local development and production.

---

## Quick Start

```bash
# Backend / scripts
cp .env.example .env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Never commit `.env` or `.env.local` to version control. Both files are listed in `.gitignore`.

---

## Backend & Script Variables (`.env`)

### Network

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NETWORK` | ✅ | `local` | Target network. One of `local`, `testnet`, `mainnet`. |
| `STELLAR_RPC_URL` | ✅ | `http://localhost:8000` | Soroban RPC endpoint. |
| `STELLAR_NETWORK_PASSPHRASE` | ✅ | Standalone passphrase | Network passphrase for transaction signing. |

**Per-network values:**

| Network | `STELLAR_RPC_URL` | `STELLAR_NETWORK_PASSPHRASE` |
|---------|-------------------|------------------------------|
| `local` | `http://localhost:8000` | `Standalone Network ; February 2021` |
| `testnet` | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` |
| `mainnet` | `https://soroban-mainnet.stellar.org` | `Public Global Stellar Network ; September 2015` |

### Admin Keys

| Variable | Required | Description |
|----------|----------|-------------|
| `STELLAR_SECRET_KEY` | ✅ | Stellar secret key (`S...`, 56 chars) for the deploying admin account. **Never share or commit this value.** |

For production, inject this via your CI/CD secrets manager — see [Secret Injection](#secret-injection) below.

### Contract Addresses

Populated automatically by `scripts/deploy.sh`. Set manually if deploying outside the script.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOVERNANCE_CONTRACT_ID` | ✅ (post-deploy) | Deployed governance contract address (`C...`, 56 chars). |
| `TOKEN_CONTRACT_ID` | ✅ (post-deploy) | Deployed token contract address (`C...`, 56 chars). |

### Governance Parameters

These configure the on-chain governance contract at initialization time.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MIN_PROPOSAL_BALANCE` | ❌ | `1000000` | Minimum token balance (in base units) to submit a proposal. Set `0` to disable. |
| `PROPOSAL_COOLDOWN` | ❌ | `86400` | Minimum seconds between proposals per address. Set `0` to disable. |
| `RESTRICT_ADMIN_VOTE` | ❌ | `true` | If `true`, the admin cannot vote on proposals they created. |

### Token Parameters

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INITIAL_TOKEN_SUPPLY` | ❌ | `1000000000` | Initial token supply (base units) minted to the admin address on first deploy. |

---

## Frontend Variables (`frontend/.env.local`)

Vite exposes only variables prefixed with `VITE_` to the browser bundle.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_NETWORK` | ✅ | Network to connect to. One of `testnet`, `mainnet`. |
| `VITE_GOVERNANCE_CONTRACT_ID` | ✅ | Governance contract address (`C...`, 56 chars). |
| `VITE_TOKEN_CONTRACT_ID` | ✅ | Token contract address (`C...`, 56 chars). |

The frontend validates these at startup via `validateConfig()` in `src/config.ts` and shows a clear error banner if they are missing or malformed.

---

## Example Configurations

### Local Development

```bash
# .env
NETWORK=local
STELLAR_RPC_URL=http://localhost:8000
STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2021"
STELLAR_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOVERNANCE_CONTRACT_ID=
TOKEN_CONTRACT_ID=
MIN_PROPOSAL_BALANCE=0
PROPOSAL_COOLDOWN=0
RESTRICT_ADMIN_VOTE=false
INITIAL_TOKEN_SUPPLY=1000000000
```

```bash
# frontend/.env.local
VITE_NETWORK=testnet
VITE_GOVERNANCE_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
VITE_TOKEN_CONTRACT_ID=CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
```

### Testnet

```bash
# .env
NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOVERNANCE_CONTRACT_ID=C...
TOKEN_CONTRACT_ID=C...
MIN_PROPOSAL_BALANCE=1000000
PROPOSAL_COOLDOWN=86400
RESTRICT_ADMIN_VOTE=true
INITIAL_TOKEN_SUPPLY=1000000000
```

### Production (Mainnet)

Never store `STELLAR_SECRET_KEY` in a plain `.env` file in production. Use secret injection instead — see below.

```bash
# .env (non-secret values only)
NETWORK=mainnet
STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
GOVERNANCE_CONTRACT_ID=C...
TOKEN_CONTRACT_ID=C...
MIN_PROPOSAL_BALANCE=1000000
PROPOSAL_COOLDOWN=86400
RESTRICT_ADMIN_VOTE=true
INITIAL_TOKEN_SUPPLY=1000000000
```

---

## Secret Injection

`STELLAR_SECRET_KEY` is the only secret in this project. Inject it at runtime, never at rest.

### GitHub Actions

```yaml
- name: Deploy contracts
  env:
    STELLAR_SECRET_KEY: ${{ secrets.STELLAR_SECRET_KEY }}
  run: bash scripts/deploy.sh
```

Store the value in **Settings → Secrets and variables → Actions**.

### Docker / docker-compose

```yaml
# docker-compose.yml
services:
  deploy:
    environment:
      - STELLAR_SECRET_KEY=${STELLAR_SECRET_KEY}
```

Pass at runtime:
```bash
STELLAR_SECRET_KEY=S... docker compose run deploy
```

### Other CI/CD systems

Inject `STELLAR_SECRET_KEY` as an environment variable from your platform's secret store (HashiCorp Vault, AWS Secrets Manager, etc.) and never write it to disk.

---

## Validation

Run `scripts/validate-env.sh` before any deployment to confirm all required variables are set:

```bash
bash scripts/validate-env.sh
```

The frontend performs its own validation on startup via `src/config.ts`.

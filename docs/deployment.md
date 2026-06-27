# Deployment Scripts

| Script | Target | Notes |
|--------|--------|-------|
| `deploy_testnet.sh` | Stellar testnet | Supports `DRY_RUN=1` for CI validation |
| `deploy_mainnet.sh` | Stellar mainnet | Requires interactive confirmation; irreversible |
| `deploy.sh` | local / testnet | General-purpose; set `NETWORK=testnet` for testnet |

---

## Required Inputs

All scripts read configuration from environment variables or a `.env` file at the project root.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STELLAR_SECRET_KEY` | Yes | — | Stellar secret key (`S...`, 56 chars) |
| `INITIAL_TOKEN_SUPPLY` | No | `1000000000` | Tokens minted to admin on init |
| `TOKEN_NAME` | No | `CosmosVote` | Human-readable token name |
| `TOKEN_SYMBOL` | No | `VOTE` | Ticker symbol |
| `TOKEN_DECIMALS` | No | `7` | Decimal places (7 is standard for Stellar) |
| `MIN_PROPOSAL_BALANCE` | No | `0` | Minimum token balance to create a proposal |
| `PROPOSAL_COOLDOWN` | No | `0` | Seconds between proposals per address |
| `RESTRICT_ADMIN_VOTE` | No | `false` | Prevent admin from voting on own proposals |

---

## Testnet Deployment

```bash
cp .env.example .env
# Edit .env — set STELLAR_SECRET_KEY at minimum

bash scripts/deploy_testnet.sh
```

### Dry Run (validates inputs without network calls)

```bash
DRY_RUN=1 bash scripts/deploy_testnet.sh
```

The dry-run mode checks:
- All required variables are present
- Numeric variables contain only digits
- `RESTRICT_ADMIN_VOTE` is `true` or `false`
- `STELLAR_SECRET_KEY` matches the Stellar secret key format

---

## Mainnet Deployment

```bash
bash scripts/deploy_mainnet.sh
```

You will be prompted to type `deploy mainnet` to confirm. Mainnet transactions are irreversible — review all parameters before running.

---

## CI Validation

The [Deploy Script Validation](.github/workflows/deploy-validation.yml) workflow runs automatically on every PR that modifies a deploy script:

1. **ShellCheck** — static analysis for syntax and common shell bugs (`-S warning`)
2. **Testnet dry run** — executes `deploy_testnet.sh` with `DRY_RUN=1` and stub credentials
3. **Mainnet syntax check** — `bash -n deploy_mainnet.sh` (no execution, no network calls)

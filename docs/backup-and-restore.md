# Backup and Restore Guide

This guide describes best practices for preserving and recovering CosmosVote contract deployment data.

## What to Back Up

After deploying CosmosVote contracts, back up the following artifacts:

| Artifact | Location | Description |
|----------|----------|-------------|
| Contract IDs | `.env` (`GOVERNANCE_CONTRACT_ID`, `TOKEN_CONTRACT_ID`) | On-chain addresses of deployed contracts |
| WASM hashes | Deployment script output | Identifies the exact code version deployed |
| Deployer key | Secure secret storage | Account that holds admin privileges |
| Network config | `config/<env>.toml` | RPC endpoint and passphrase used at deploy time |

## Backing Up Contract Deployment Metadata

### 1. Save contract IDs immediately after deployment

After running a deploy script, contract IDs are printed to stdout. Persist them:

```bash
# Capture deploy output
bash scripts/deploy.sh 2>&1 | tee deploy-$(date +%Y%m%d).log

# Extract and store contract IDs
grep 'CONTRACT_ID' deploy-$(date +%Y%m%d).log >> .env
```

### 2. Archive the deployment log

```bash
mkdir -p backups/
cp deploy-$(date +%Y%m%d).log backups/
```

### 3. Store secrets securely

Never commit `STELLAR_SECRET_KEY` to version control. Use a secrets manager:

- **AWS Secrets Manager** / **GCP Secret Manager** for cloud deployments
- **1Password** / **Bitwarden** for team environments
- **Encrypted local file**: `gpg --symmetric .env` → store the `.env.gpg`

### 4. Version-pin WASM artifacts

```bash
# After make build, archive the compiled WASMs with the git commit SHA
tar -czf backups/wasm-$(git rev-parse --short HEAD).tar.gz \
  target/wasm32-unknown-unknown/release/*.wasm
```

## Recovery Steps

### Scenario A: Lost contract IDs

If you lose `GOVERNANCE_CONTRACT_ID` or `TOKEN_CONTRACT_ID`:

1. Check deployment logs in `backups/`.
2. Query the Stellar network for contracts deployed by your account:
   ```bash
   stellar contract history --network <env> --source-account <YOUR_PUBLIC_KEY>
   ```
3. Restore the IDs to `.env` and verify:
   ```bash
   stellar contract invoke --id <CONTRACT_ID> --network <env> -- get_admin
   ```

### Scenario B: Failed deployment (partial state)

If a deployment script fails mid-way:

1. Check which contracts were deployed from the log output.
2. If the token contract deployed but governance did not:
   ```bash
   # Re-run deploy with the existing token contract ID
   TOKEN_CONTRACT_ID=<existing_id> bash scripts/deploy.sh
   ```
3. If the governance contract initialized but is in a bad state, **do not re-initialize** — call `cancel` on any open proposals via admin, then redeploy with a new contract ID.

### Scenario C: Network incident / RPC outage

1. Switch to an alternate RPC endpoint by updating `config/<env>.toml` or `.env`:
   ```toml
   rpc_url = "https://alternate-rpc.stellar.org"
   ```
2. Verify contract state is intact:
   ```bash
   stellar contract invoke --id $GOVERNANCE_CONTRACT_ID --network testnet -- get_proposal_count
   ```
3. On-chain state is maintained by the Stellar network — no data is lost during an RPC outage.

### Scenario D: Accidental admin key loss

If the admin private key is lost and you have a multisig setup:

1. Use the multisig recovery procedure in [`docs/admin-multisig-pattern.md`](./admin-multisig-pattern.md).
2. If no multisig is configured, the contract admin is permanently locked — redeploy.

## Recommended Tooling

| Tool | Purpose |
|------|---------|
| [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-stellar-cli) | Query and interact with deployed contracts |
| [Stellar Laboratory](https://laboratory.stellar.org/) | Inspect transactions and contract state visually |
| `gpg` | Encrypt and store `.env` secrets locally |
| AWS/GCP Secrets Manager | Production secret storage |
| Git (tagged releases) | Version-pin WASM builds to commit SHAs |

## Pre-Deployment Checklist

- [ ] `.env` backed up securely
- [ ] WASM artifacts archived with git SHA
- [ ] Deployer key stored in secrets manager
- [ ] Deployment log directory exists (`mkdir -p backups/`)
- [ ] Target network RPC is reachable (`curl <rpc_url>/`)

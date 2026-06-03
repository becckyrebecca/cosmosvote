# Rollback Procedure

This document explains how to recover from a failed or bad CosmosVote deployment.

## Important limitation

Soroban smart contracts are **immutable once deployed**. A rollback does not remove or modify on-chain contracts. It restores the *contract ID references* in your environment (`.env`) so your application points back to the previously known-good contracts.

---

## How backups work

Every run of `deploy.sh` or `deploy_mainnet.sh` saves the current contract IDs to a timestamped file before touching anything:

```
logs/backups/contracts_<network>_<YYYYMMDD_HHMMSS>.env
```

Example:
```
# CosmosVote contract backup — 2026-06-02T05:00:00Z
# Network: testnet
TOKEN_CONTRACT_ID=CAABC...
GOVERNANCE_CONTRACT_ID=CBXYZ...
```

---

## Rollback steps

### 1. List available backups

```bash
./scripts/rollback.sh
```

### 2. Restore the most recent backup

```bash
./scripts/rollback.sh --latest
```

### 3. Restore a specific backup

```bash
./scripts/rollback.sh logs/backups/contracts_testnet_20260602_050000.env
```

The script will:
1. Read `TOKEN_CONTRACT_ID` and `GOVERNANCE_CONTRACT_ID` from the backup.
2. Update `.env` in-place (or print export commands if `.env` is absent).
3. Call `total_supply` and `get_proposal_count` on-chain to confirm the restored contracts respond (requires `STELLAR_SECRET_KEY`).

---

## Post-deployment verification

`deploy.sh` and `deploy_mainnet.sh` automatically verify both contracts respond before printing the success summary. If verification fails the script exits with an error — check the log file for details.

To verify manually at any time:

```bash
# Token contract
stellar contract invoke \
  --id "$TOKEN_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "<passphrase>" \
  -- total_supply

# Governance contract
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "<passphrase>" \
  -- get_proposal_count
```

---

## Partial deployment recovery

If deployment failed after the token contract was deployed but before governance was deployed:

1. Note the `TOKEN_CONTRACT_ID` printed in the logs (`logs/deploy_*.log`).
2. Set `TOKEN_CONTRACT_ID` in `.env` manually.
3. Re-run `deploy.sh` — the script will deploy a fresh governance contract and verify both.

If the partial deployment left a governance contract initialised against a stale token contract, treat it as dead and redeploy from scratch. Use `rollback.sh --latest` to restore the last known-good pair.

---

## Log files

All script output is tee'd to timestamped files under `logs/`:

| File pattern | Script |
|---|---|
| `logs/deploy_*.log` | `deploy.sh` |
| `logs/deploy_mainnet_*.log` | `deploy_mainnet.sh` |
| `logs/rollback_*.log` | `rollback.sh` |
| `logs/backups/contracts_*.env` | Pre-deployment backups |

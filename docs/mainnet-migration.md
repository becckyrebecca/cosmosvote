# Mainnet Deployment Guide

This guide covers everything needed to safely deploy CosmosVote to Stellar mainnet.

> ⚠️ **Mainnet transactions are irreversible.** Work through every pre-deployment check before executing.

---

## 1. Pre-Deployment Checklist

### Code & Audit

- [ ] All tests pass: `make test` (60+ tests, zero failures)
- [ ] No Clippy warnings: `make lint`
- [ ] Code is formatted: `make fmt`
- [ ] WASM builds cleanly: `make build`
- [ ] Review [AUDIT.md](../AUDIT.md) — confirm scope and findings are addressed
- [ ] Review [docs/security/threat-model.md](./security/threat-model.md) — confirm mitigations are in place
- [ ] Review [docs/security/known-issues.md](./security/known-issues.md) — confirm all known issues are resolved or accepted

### Contract Audit Requirements

Before mainnet deployment, the contracts **must** be audited by a qualified third-party security firm. Minimum scope:

| Area | Requirement |
|------|------------|
| Authorization | Verify `require_auth()` on every state-changing function |
| Integer arithmetic | Confirm `checked_add` / `checked_sub` on all token math |
| Double-vote prevention | Confirm `HasVoted` flag is set atomically with the vote |
| Admin controls | Verify pause/unpause and admin-transfer logic |
| Re-entrancy | Confirm no cross-contract calls before state is committed |
| Storage exhaustion | Confirm TTL / bump strategies prevent storage expiry |

Document the audit report in `AUDIT.md` before proceeding.

### Infrastructure

- [ ] Stellar account is funded with sufficient XLM for contract deployment and initialization
- [ ] Account is not a custodial/exchange address — you must control the secret key
- [ ] `STELLAR_SECRET_KEY` is stored in a secrets manager (not in `.env` on a shared machine)
- [ ] Deployment machine has Stellar CLI 22+ and Rust 1.75+ installed

---

## 2. Configure `config/mainnet.toml`

The file at `config/mainnet.toml` holds the RPC endpoint and network passphrase:

```toml
rpc_url = "https://soroban-mainnet.stellar.org"
network_passphrase = "Public Global Stellar Network ; September 2015"
network = "mainnet"
```

You may point `rpc_url` at a private RPC node for higher reliability. The `network_passphrase` **must not** be changed — it is a consensus-level constant.

### Environment Variables

Copy and populate the environment file:

```bash
cp .env.example .env
```

Key variables for mainnet:

| Variable | Description | Example |
|----------|-------------|---------|
| `NETWORK` | Target network | `mainnet` |
| `STELLAR_RPC_URL` | RPC endpoint | `https://soroban-mainnet.stellar.org` |
| `STELLAR_SECRET_KEY` | Deployer secret key (S…) | `SXXX…` |
| `INITIAL_TOKEN_SUPPLY` | Initial CVT supply (stroops) | `1000000000` |
| `MIN_PROPOSAL_BALANCE` | Min tokens to create a proposal | `1000000` |
| `PROPOSAL_COOLDOWN` | Seconds between proposals per address | `86400` |
| `RESTRICT_ADMIN_VOTE` | Prevent admin from voting | `true` |

---

## 3. Build Release WASM Binaries

```bash
rustup target add wasm32-unknown-unknown
make build
```

Verify the output files exist:

```bash
ls -lh target/wasm32-unknown-unknown/release/*.wasm
# cosmosvote_governance.wasm  ~50–80 KB
# cosmosvote_token.wasm       ~30–50 KB
```

---

## 4. Deploy to Mainnet

Run the deployment script. It will prompt for an explicit confirmation before sending any transactions:

```bash
./scripts/deploy_mainnet.sh
```

When prompted, type exactly:

```
deploy mainnet
```

The script will:
1. Build WASM (if not already built)
2. Deploy the token contract and call `initialize`
3. Deploy the governance contract and call `initialize`
4. Print both contract IDs

Save the output:

```
TOKEN_CONTRACT_ID=C...
GOVERNANCE_CONTRACT_ID=C...
```

Add them to your `.env` and to any off-chain indexers or frontends.

---

## 5. Post-Deploy Verification

Run every step below immediately after deployment. If any step fails, use `cancel` to halt active proposals and investigate before proceeding.

### 5.1 Verify Contract State

```bash
# Check governance is initialized
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- get_admin

# Check token supply
stellar contract invoke \
  --id $TOKEN_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- total_supply
```

### 5.2 Create a Smoke-Test Proposal

```bash
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- create_proposal \
  --proposer <ADMIN_ADDRESS> \
  --title "Mainnet smoke test" \
  --description "Verify governance contract is live on mainnet" \
  --quorum 1 \
  --duration 60
```

Expected output: a proposal ID (e.g., `0`).

### 5.3 Cast a Vote

```bash
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- cast_vote \
  --voter <ADMIN_ADDRESS> \
  --proposal_id 0 \
  --vote '{"tag":"Yes"}'
```

### 5.4 Finalize and Verify Outcome

After the duration elapses (or for a 60-second test, wait 1 minute):

```bash
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- finalise \
  --proposal_id 0
```

Query the proposal state — it should be `Passed`:

```bash
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- get_proposal \
  --proposal_id 0
```

### 5.5 Update the Frontend

In `frontend/.env`:

```
VITE_GOVERNANCE_CONTRACT_ID=<GOVERNANCE_CONTRACT_ID>
VITE_TOKEN_CONTRACT_ID=<TOKEN_CONTRACT_ID>
VITE_NETWORK=mainnet
VITE_STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
```

Rebuild and redeploy the frontend:

```bash
cd frontend && npm run build
```

---

## 6. Emergency Procedures

| Situation | Action |
|-----------|--------|
| Bug found post-deploy | Call `pause()` immediately to halt new proposals and votes |
| Admin key compromised | Call `transfer_admin()` from a backup key before attacker does |
| Stuck proposal | Admin can call `cancel()` on any active proposal |

See [SECURITY.md](../SECURITY.md) for the vulnerability disclosure policy.

---

## Related Documents

- [Getting Started](./GETTING_STARTED.md)
- [Proposal Lifecycle](./lifecycle.md)
- [Storage Model](./storage.md)
- [Security Threat Model](./security/threat-model.md)
- [AUDIT.md](../AUDIT.md)

# CosmosVote Operational Runbook

Common operational tasks for administrators of the CosmosVote governance contract.

**Prerequisites** — all commands require these environment variables:

```bash
export GOVERNANCE_CONTRACT_ID=<your-governance-contract-id>
export STELLAR_SECRET_KEY=<your-admin-secret-key>
export STELLAR_RPC_URL=<rpc-url>               # e.g. https://soroban-testnet.stellar.org
export NETWORK_PASSPHRASE="Test SDF Network ; September 2015"  # or mainnet passphrase
```

---

## 1. Pause the Contract

Stops all state-changing operations (create proposal, cast vote, finalize, execute, cancel). Use during incidents or upgrades.

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- pause \
  --admin "$(stellar keys address "$STELLAR_SECRET_KEY")"
```

**Verify:** any non-read call should return error `40 ContractPaused`.

---

## 2. Unpause the Contract

Resumes normal operations after a pause.

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- unpause \
  --admin "$(stellar keys address "$STELLAR_SECRET_KEY")"
```

---

## 3. Update Quorum on an Active Proposal

Adjusts the quorum threshold on a proposal that is still **Active and has received zero votes**.

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- update_quorum \
  --admin "$(stellar keys address "$STELLAR_SECRET_KEY")" \
  --proposal_id <PROPOSAL_ID> \
  --new_quorum <NEW_QUORUM>
```

Replace `<PROPOSAL_ID>` with the target proposal's numeric ID and `<NEW_QUORUM>` with the new minimum vote-weight threshold (must be > 0 and ≤ total token supply).

---

## 4. Transfer Admin (Two-Step)

Admin transfer is a two-step process to prevent accidental loss of admin access.

**Step 1 — current admin initiates the transfer:**

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- transfer_admin \
  --admin "$(stellar keys address "$STELLAR_SECRET_KEY")" \
  --new_admin <NEW_ADMIN_ADDRESS>
```

**Step 2 — new admin accepts** (signed by the new admin's key):

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$NEW_ADMIN_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- accept_admin \
  --pending_admin <NEW_ADMIN_ADDRESS>
```

The transfer is only complete after Step 2. Until then, the original admin retains control.

---

## 5. Deploy a New Contract Version

```bash
# 1. Build the updated WASM
cargo build --release --target wasm32-unknown-unknown

# 2. Deploy new token contract (if changed)
NEW_TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/cosmosvote_token.wasm \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

# 3. Deploy new governance contract
NEW_GOV_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

# 4. Initialize governance
ADMIN_ADDRESS=$(stellar keys address "$STELLAR_SECRET_KEY")
stellar contract invoke \
  --id "$NEW_GOV_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --voting_token "$NEW_TOKEN_ID" \
  --min_proposal_balance 0 \
  --proposal_cooldown 0 \
  --restrict_admin_vote false

echo "New governance contract: $NEW_GOV_ID"
```

Update `GOVERNANCE_CONTRACT_ID` and `TOKEN_CONTRACT_ID` in your `.env` file after deployment. Pause the old contract before cutting over.

---

## Troubleshooting

| Error | Code | Cause | Fix |
|-------|------|-------|-----|
| `ContractPaused` | 40 | Contract is paused | Run `unpause` first |
| `NotPaused` | 41 | Calling `unpause` on an already-active contract | No action needed |
| `NotAdmin` | 30 | `--source` key is not the current admin | Use the correct admin key |
| `NoPendingAdmin` | — | Calling `accept_admin` with no pending transfer | Run `transfer_admin` first |
| `NotPendingAdmin` | — | `accept_admin` caller does not match pending admin | Use the exact address set in `transfer_admin` |
| `ProposalNotFound` | 10 | Invalid `--proposal_id` | Verify the proposal ID exists |
| `ProposalNotActive` | 11 | `update_quorum` called on a non-Active proposal | Only active proposals can be updated |
| `QuorumUpdateNotAllowed` | — | Proposal already has votes | Quorum can only be changed before any votes are cast |
| `QuorumExceedsSupply` | 16 | `new_quorum` > total token supply | Lower the quorum value |
| `AlreadyInitialized` | 1 | `initialize` called on an already-initialized contract | Deploy a fresh contract instead |

For the full error reference see [docs/errors.md](./errors.md).

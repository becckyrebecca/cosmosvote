# Contract Upgrade and Migration

This document covers the end-to-end process for upgrading CosmosVote contracts and migrating state when required.

## Overview

CosmosVote governance and token contracts support in-place WASM upgrades via an admin-only `upgrade` entrypoint. Upgrading replaces the contract bytecode while keeping the same contract ID and all existing on-chain state. State migration (transforming stored data to a new schema) must be handled explicitly when storage layout changes.

---

## Upgrade API

```rust
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), ContractError>
```

**Requirements:**
- Caller must be the current governance admin.
- `new_wasm_hash` must be the SHA-256 hash of the new WASM binary already uploaded to the network.

**Effect:**
- Calls `env.deployer().update_current_contract_wasm(new_wasm_hash)` — replaces the bytecode in-place.
- Emits an `Upgraded` event containing the new WASM hash.
- Does **not** modify any stored state.

---

## Step-by-Step Upgrade Workflow

### 1. Build the new WASM

```bash
make build
# Output: target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm
```

### 2. Upload the WASM to the network

```bash
stellar contract upload \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --wasm target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm
```

The command prints the 32-byte hex WASM hash. Save it — you need it in the next step.

### 3. Invoke the upgrade entrypoint

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  -- upgrade \
  --admin "$ADMIN_ADDRESS" \
  --new_wasm_hash "<hex-hash-from-step-2>"
```

### 4. Verify the upgrade

```bash
# Confirm the contract still responds correctly
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  -- get_config
```

Check that `proposal_count`, `admin`, and other config values are unchanged.

---

## Admin Requirements

- Only the address stored as `Admin` in the contract's instance storage may call `upgrade`.
- If admin privileges are shared across a multisig, all required signers must authorize the transaction. See [docs/admin-multisig-pattern.md](./admin-multisig-pattern.md).
- The two-step admin transfer (`propose_admin` / `accept_admin`) must be completed before the upgrade if the admin key needs to rotate.

---

## State Migration

### When is migration needed?

Migration is needed whenever a new WASM version changes the **storage schema** — for example:

- Renaming a storage key
- Changing the type of a stored value
- Adding a required new key with no default
- Removing a key that is still read by the new code path

The `upgrade` entrypoint only swaps bytecode. It does **not** transform existing data. If the new WASM reads a storage key that does not exist yet, the call will return `None` or the default value — which may be incorrect.

### Migration strategy

#### Option A — Lazy migration (recommended for additive changes)

If the new schema is additive (new keys with sane defaults), handle missing values gracefully in the new WASM:

```rust
// In storage.rs — read with fallback
pub fn get_new_field(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::NewField).unwrap_or(0)
}
```

No explicit migration transaction is needed. The value is populated on first write.

#### Option B — Migration entrypoint (required for breaking changes)

Add a one-time `migrate` entrypoint to the new WASM that reads old keys, transforms the data, and writes the new schema:

```rust
pub fn migrate(env: Env, admin: Address) -> Result<(), ContractError> {
    admin.require_auth();
    require_admin(&env, &admin)?;

    // Read old format
    let old_value: OldType = env.storage().instance()
        .get(&DataKey::OldKey)
        .ok_or(ContractError::NotInitialized)?;

    // Write new format
    env.storage().instance().set(&DataKey::NewKey, &NewType::from(old_value));

    // Clean up old key
    env.storage().instance().remove(&DataKey::OldKey);
    Ok(())
}
```

Call it immediately after upgrading:

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  -- migrate \
  --admin "$ADMIN_ADDRESS"
```

Remove or gate the `migrate` entrypoint in a subsequent upgrade once migration is complete.

---

## Rollback Considerations

Soroban contracts **cannot be rolled back** to a previous WASM on-chain. Once `upgrade` is called, the new bytecode is live.

Mitigation strategies:

1. **Test on testnet first.** Always upgrade and migrate on testnet before mainnet.
2. **Backup contract IDs.** `deploy.sh` automatically saves contract ID backups to `logs/backups/` before any deployment. See [docs/rollback.md](./rollback.md).
3. **Pause before upgrading.** Call `pause` to block `create_proposal`, `cast_vote`, and `finalise` during the upgrade window, then `unpause` after verification.
4. **Include a re-upgrade path.** If the new WASM is broken, the admin can immediately upload the previous WASM and call `upgrade` again with the old hash — provided the storage schema has not been destructively altered.

### Upgrade with pause window

```bash
# 1. Pause the contract
stellar contract invoke --id "$GOVERNANCE_CONTRACT_ID" ... -- pause --admin "$ADMIN_ADDRESS"

# 2. Upload new WASM and capture hash
NEW_HASH=$(stellar contract upload ... --wasm cosmosvote_governance.wasm)

# 3. Upgrade
stellar contract invoke --id "$GOVERNANCE_CONTRACT_ID" ... -- upgrade \
  --admin "$ADMIN_ADDRESS" --new_wasm_hash "$NEW_HASH"

# 4. Run migration (if needed)
stellar contract invoke --id "$GOVERNANCE_CONTRACT_ID" ... -- migrate --admin "$ADMIN_ADDRESS"

# 5. Verify
stellar contract invoke --id "$GOVERNANCE_CONTRACT_ID" ... -- get_config

# 6. Unpause
stellar contract invoke --id "$GOVERNANCE_CONTRACT_ID" ... -- unpause --admin "$ADMIN_ADDRESS"
```

---

## Upgrade Checklist

- [ ] New WASM compiled and tested locally (`make test`)
- [ ] Storage schema changes documented and migration strategy chosen
- [ ] Upgrade tested on testnet
- [ ] Existing contract IDs backed up (`logs/backups/`)
- [ ] Contract paused before upgrade (recommended for production)
- [ ] WASM uploaded to network; hash captured
- [ ] `upgrade` entrypoint invoked successfully
- [ ] Migration entrypoint invoked (if applicable)
- [ ] Post-upgrade verification passes (`get_config`, `get_proposal`, etc.)
- [ ] Contract unpaused
- [ ] `CHANGELOG.md` updated with upgrade notes

---

## Related Documentation

- [Rollback Procedure](./rollback.md)
- [Admin Multisig Pattern](./admin-multisig-pattern.md)
- [Storage Layout](./storage.md)
- [Runbook](./runbook.md)

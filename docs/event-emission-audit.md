# Event Emission Audit

**Issue:** #299  
**Audited:** `contracts/governance/src/lib.rs`, `contracts/governance/src/events.rs`, `contracts/token/src/lib.rs`, `contracts/token/src/events.rs`  
**Result:** ✅ All state-changing methods emit a structured on-chain event.

---

## Governance Contract

| Method | Event topic | Event data | Status |
|--------|-------------|-----------|--------|
| `initialize` | `("gov", "init")` | `(admin, voting_token)` | ✅ |
| `create_proposal` | `("gov", "created")` | `(id, proposer, title, quorum, end_time)` | ✅ |
| `cast_vote` | `("gov", "voted")` | `(proposal_id, voter, vote, weight)` | ✅ |
| `finalise` | `("gov", "final")` | `(proposal_id, new_state)` | ✅ |
| `execute` | `("gov", "exec")` | `(proposal_id, admin)` | ✅ |
| `cancel` | `("gov", "cancel")` | `(proposal_id, admin)` | ✅ |
| `update_quorum` | `("gov", "quorum")` | `(proposal_id, old_quorum, new_quorum)` | ✅ |
| `transfer_admin` | `("gov", "admin")` | `(old_admin, new_admin)` | ✅ |
| `pause` | `("gov", "paused")` | `(admin)` | ✅ |
| `unpause` | `("gov", "unpause")` | `(admin)` | ✅ |

Read-only methods (`get_config`, `get_proposal`, `proposal_count`, `get_proposals`, `has_voted`, `get_vote`, `admin`, `version`) correctly emit no events.

---

## Token Contract

| Method | Event topic | Event data | Status |
|--------|-------------|-----------|--------|
| `initialize` | `("token", "init")` | `(admin, supply)` | ✅ |
| `transfer` | `("token", "xfer")` | `(from, to, amount)` | ✅ |
| `transfer_from` | `("token", "xfer")` | `(from, to, amount)` | ✅ |
| `approve` | `("token", "approve")` | `(owner, spender, amount)` | ✅ |
| `mint` | `("token", "mint")` | `(admin, to, amount)` | ✅ |
| `burn` | `("token", "burn")` | `(admin, from, amount)` | ✅ |
| `transfer_admin` | `("token", "admin")` | `(old_admin, new_admin)` | ✅ |

Read-only methods (`total_supply`, `balance`, `balance_of`, `allowance`, `admin`, `version`) correctly emit no events.

---

## Event Schema Reference

```
# Governance
gov / init      → (admin: Address, token: Address)
gov / created   → (id: u64, proposer: Address, title: String, quorum: i128, end_time: u64)
gov / voted     → (proposal_id: u64, voter: Address, vote: Vote, weight: i128)
gov / final     → (proposal_id: u64, state: ProposalState)   # Passed | Rejected
gov / exec      → (proposal_id: u64, admin: Address)
gov / cancel    → (proposal_id: u64, admin: Address)
gov / quorum    → (proposal_id: u64, old_quorum: i128, new_quorum: i128)
gov / admin     → (old_admin: Address, new_admin: Address)
gov / paused    → admin: Address
gov / unpause   → admin: Address

# Token
token / init    → (admin: Address, supply: i128)
token / xfer    → (from: Address, to: Address, amount: i128)
token / approve → (owner: Address, spender: Address, amount: i128)
token / mint    → (admin: Address, to: Address, amount: i128)
token / burn    → (admin: Address, from: Address, amount: i128)
token / admin   → (old: Address, new: Address)
```

---

## Notes for Off-Chain Indexers

- Filter governance events by first topic `"gov"`; token events by `"token"`.
- `vote` in `gov/voted` and `state` in `gov/final` are Soroban enums — deserialise as `ScVal::Symbol`.
- Self-transfers (`from == to`) return `Ok(())` without an event — consistent with SEP-41.
- All amounts are raw `i128` base units (7 decimal places for CVT).

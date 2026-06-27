# Storage Model

CosmosVote uses Soroban's three storage tiers strategically to minimize costs.
<!-- . -->

## Tiers

| Tier | Lifetime | Cost | Use Case |
|------|----------|------|----------|
| Instance | Contract lifetime | Cheapest reads | Contract-wide config |
| Persistent | Survives ledger expiry | Medium | Per-proposal / per-voter data |
| Temporary | Expires with ledger TTL | Cheapest writes | Short-lived allowances |

## Governance Contract

### Instance Storage

| Key | Type | Notes |
|-----|------|-------|
| `Admin` | `Address` | Set once at init |
| `PendingAdmin` | `Address` | Pending two-step transfer |
| `VotingToken` | `Address` | Set once at init |
| `MinProposalBalance` | `i128` | 0 = no minimum |
| `ProposalCooldown` | `u64` | 0 = no cooldown |
| `RestrictAdminVote` | `bool` | — |
| `Paused` | `bool` | — |
| `ContractState` | `ContractState` | Uninitialized / Ready |
| `Version` | `(u32, u32, u32)` | Semantic version |

### Persistent Storage

| Key | Type | Notes |
|-----|------|-------|
| `ProposalCount` | `u64` | Moved from Instance to avoid contention |
| `Proposal(id)` | `Proposal` | Full proposal state |
| `HasVoted(id, voter)` | `bool` | Double-vote guard |
| `VoteRecord(id, voter)` | `VoteRecord` | Vote type + weight |
| `LastProposal(proposer)` | `u64` | Cooldown timestamp |

## Token Contract

### Instance Storage

| Key | Type | Notes |
|-----|------|-------|
| `Admin` | `Address` | — |
| `PendingAdmin` | `Address` | Pending two-step transfer |
| `TotalSupply` | `i128` | Aggregate supply |
| `Initialized` | `bool` | Init guard |
| `Version` | `(u32, u32, u32)` | — |

### Persistent Storage

| Key | Type | Notes |
|-----|------|-------|
| `Balance(owner)` | `i128` | Per-address balance |

### Temporary Storage

| Key | Type | Notes |
|-----|------|-------|
| `Allowance(owner, spender)` | `Allowance { amount: i128, expiry_ledger: u32 }` | Expires after `expiry_ledger`, with TTL bumped on allowance reads and writes |

## Rationale

Instance storage is loaded once per contract invocation at a fixed cost, making it ideal for frequently-read config. Persistent storage survives ledger expiry independently, ensuring proposal and vote data is never lost. Temporary storage is used for allowances because they are short-lived by design and do not need to survive ledger expiry.

## Storage TTL Extension (Persistent Keys)

Soroban persistent storage entries carry a TTL that decrements each ledger. If a TTL reaches zero without being bumped, the entry is archived and effectively lost. CosmosVote extends the TTL on **every write** to persistent storage so that entries remain live for the full expected lifecycle.

| Key | TTL (ledgers) | Rationale |
|-----|--------------|-----------|
| `Proposal(id)` | 518 400 (~30 days at 5 s/ledger) | Covers max voting duration (2 592 000 s) plus buffer |
| `HasVoted(id, voter)` | 518 400 | Vote guards must outlive the proposal |
| `VoteRecord(id, voter)` | 518 400 | Vote records must outlive the proposal |
| `LastProposal(proposer)` | 120 960 (~7 days) | Only needs to cover the cooldown window |

### Assumptions

* Average ledger close time: **5 seconds**. If the network is slower, TTLs cover proportionally less wall-clock time.
* TTL is bumped on **write only**. Read-heavy paths (e.g. `get_proposal`) do not pay the bump fee; callers that need extended live reads should submit a separate `extend_ttl` operation.
* Archived entries can be restored via Soroban's `RestoreFootprint` operation — bump fees are cheaper than restoration fees, so proactive extension on write is the preferred strategy.

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
| `Allowance(owner, spender)` | `i128` | Expires with ledger TTL |

## Rationale

Instance storage is loaded once per contract invocation at a fixed cost, making it ideal for frequently-read config. Persistent storage survives ledger expiry independently, ensuring proposal and vote data is never lost. Temporary storage is used for allowances because they are short-lived by design and do not need to survive ledger expiry.

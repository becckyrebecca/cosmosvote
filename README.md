# CosmosVote Contracts

[![CI](https://github.com/PrincessnJoy/cosmosvote/actions/workflows/ci.yml/badge.svg)](https://github.com/PrincessnJoy/cosmosvote/actions/workflows/ci.yml)
[![CodeQL](https://github.com/PrincessnJoy/cosmosvote/actions/workflows/codeql.yml/badge.svg)](https://github.com/PrincessnJoy/cosmosvote/actions/workflows/codeql.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

Soroban smart contracts for **CosmosVote** — decentralized on-chain governance and voting on the Stellar blockchain.

CosmosVote enables DAOs, protocols, and communities to create proposals, cast token-weighted votes, enforce quorum, and execute decisions — all transparently on-chain with an immutable audit trail.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Governance Contract Reference](#governance-contract-reference)
- [Token Contract Reference](#token-contract-reference)
- [Proposal Lifecycle](#proposal-lifecycle)
- [Storage & Data Structures](#storage--data-structures)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [Resources](#resources)

---

## Project Overview

### Motivation

Decentralized governance is critical for DAOs, protocols, and communities to make collective decisions transparently and fairly. CosmosVote provides a production-ready governance system on Stellar's Soroban platform with:

- **Token-weighted voting** — voting power proportional to economic stake
- **Quorum enforcement** — minimum participation thresholds
- **Immutable audit trail** — all votes and decisions recorded on-chain
- **Flexible proposal lifecycle** — from creation through execution or cancellation
- **Cost-efficient storage** — optimized for Soroban's tiered storage model

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CosmosVote System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Governance Contract │      │   Token Contract     │    │
│  ├──────────────────────┤      ├──────────────────────┤    │
│  │ • Proposals          │      │ • Balances           │    │
│  │ • Voting             │◄─────┤ • Transfers          │    │
│  │ • Finalization       │      │ • Mint/Burn          │    │
│  │ • Execution          │      │ • Allowances         │    │
│  │ • Cancellation       │      │ • Admin Control      │    │
│  └──────────────────────┘      └──────────────────────┘    │
│           │                              │                   │
│           └──────────────┬───────────────┘                  │
│                          │                                   │
│                    ┌─────▼──────┐                           │
│                    │  Soroban   │                           │
│                    │ Blockchain │                           │
│                    │ (Stellar)  │                           │
│                    └────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Approach |
|----------|----------|
| Voting model | Token-weighted — vote weight = balance at vote time |
| Vote types | Yes / No / Abstain (abstain counts toward quorum, not outcome) |
| Double-vote prevention | Persistent `HasVoted` flag per (proposal, voter) |
| Storage tiers | Instance for config, Persistent for proposals/votes, Temporary for allowances |
| Events | Every state transition emits an on-chain event |
| Tie handling | Tie (yes == no) results in rejection |

---

## Features

- **Proposals** — create governance proposals with title, description, quorum, and voting duration
- **Token-weighted voting** — vote weight equals the voter's governance token balance
- **Yes / No / Abstain** — three-way vote with quorum and majority enforcement
- **Double-vote prevention** — each address can vote exactly once per proposal
- **Lifecycle management** — Active → Passed/Rejected → Executed, or Cancelled by admin
- **On-chain events** — every action emits a verifiable event for off-chain indexers
- **Admin controls** — pause/unpause, update quorum, transfer admin privileges
- **Proposal cooldown** — optional rate limiting per proposer
- **Minimum balance requirement** — optional minimum tokens to create proposals

---

## Quick Start

### Prerequisites

- Rust 1.75+ with `wasm32-unknown-unknown` target
- Stellar CLI (optional, for deployment)
- Docker & Docker Compose (optional)

### Installation & Testing

```bash
# Clone the repository
git clone https://github.com/PrincessnJoy/cosmosvote.git
cd cosmosvote

# Add WASM target
rustup target add wasm32-unknown-unknown

# Run tests
make test

# Build WASM binaries
make build

# View documentation
cargo doc --no-deps --open
```

---

## Project Structure

```
cosmosvote/
├── contracts/
│   ├── governance/                    # Governance contract
│   │   ├── src/
│   │   │   ├── lib.rs                # Main contract implementation
│   │   │   ├── storage.rs            # Storage accessors & tier strategy
│   │   │   ├── events.rs             # Event emission
│   │   │   ├── types.rs              # Error types & data structures
│   │   │   ├── test.rs               # Unit tests (40+ tests)
│   │   │   ├── test_helpers.rs       # Test utilities
│   │   │   └── prop_tests.rs         # Property-based tests
│   │   └── Cargo.toml
│   │
│   └── token/                        # Token contract
│       ├── src/
│       │   ├── lib.rs                # Token implementation
│       │   ├── storage.rs            # Storage accessors
│       │   ├── events.rs             # Event emission
│       │   ├── types.rs              # Error types & data structures
│       │   └── test.rs               # Unit tests (20+ tests)
│       └── Cargo.toml
│
├── docs/
│   ├── adr/                          # Architecture Decision Records
│   ├── security/                     # Security documentation
│   ├── examples/                     # Integration examples
│   ├── GETTING_STARTED.md
│   ├── lifecycle.md
│   ├── storage.md
│   ├── errors.md
│   └── faq.md
│
├── scripts/
│   ├── deploy.sh                     # Deploy to local/testnet
│   ├── deploy_mainnet.sh             # Deploy to mainnet
│   └── test_wasm.sh                  # Test WASM builds
│
├── config/
│   ├── local.toml
│   ├── testnet.toml
│   └── mainnet.toml
│
├── frontend/                         # React + Vite proposal browser
├── Cargo.toml                        # Workspace manifest
├── Makefile
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md
├── SECURITY.md
├── AUDIT.md
├── CHANGELOG.md
└── README.md
```

---

## Governance Contract Reference

### Initialization

```rust
pub fn initialize(
    env: Env,
    admin: Address,
    voting_token: Address,
    min_proposal_balance: i128,
    proposal_cooldown: u64,
    restrict_admin_vote: bool,
) -> Result<(), ContractError>
```

### Create Proposal

```rust
pub fn create_proposal(
    env: Env,
    proposer: Address,
    title: String,        // 1–128 chars
    description: String,  // 1–1024 chars
    quorum: i128,         // > 0, <= total supply
    duration: u64,        // 60–2,592,000 seconds
) -> Result<u64, ContractError>
```

### Cast Vote

```rust
pub fn cast_vote(
    env: Env,
    voter: Address,
    proposal_id: u64,
    vote: Vote,           // Yes | No | Abstain
) -> Result<(), ContractError>
```

### Finalize

```rust
pub fn finalise(env: Env, proposal_id: u64) -> Result<(), ContractError>
```

Pass conditions: `total_votes >= quorum AND votes_yes > votes_no`

### Execute / Cancel

```rust
pub fn execute(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError>
pub fn cancel(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError>
```

---

## Token Contract Reference

### SEP-41 Compliance

The CosmosVote token contract implements the **Stellar Enhancement Proposal 41 (SEP-41)** standard for token contracts on Soroban. This ensures wallet and explorer compatibility for token discovery, display, and transfer operations.

### Initialization

```rust
pub fn initialize(
    env: Env,
    admin: Address,
    initial_supply: i128,
    name: String,
    symbol: String,
    decimals: u32
) -> Result<(), ContractError>
```

**Parameters:**
- `admin` — Receives initial supply and admin privileges
- `initial_supply` — Total tokens minted to admin
- `name` — Human-readable token name (e.g., "CosmosVote")
- `symbol` — Ticker symbol (e.g., "VOTE")
- `decimals` — Number of decimal places (typically 7 for Stellar)

### Core Operations

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), ContractError>
pub fn mint(env: Env, admin: Address, to: Address, amount: i128) -> Result<(), ContractError>
pub fn burn(env: Env, admin: Address, from: Address, amount: i128) -> Result<(), ContractError>
pub fn burn_self(env: Env, owner: Address, amount: i128) -> Result<(), ContractError>
pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) -> Result<(), ContractError>
pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), ContractError>
```

### SEP-41 Query Functions

```rust
pub fn name(env: Env) -> String              // Token name
pub fn symbol(env: Env) -> String            // Ticker symbol
pub fn decimals(env: Env) -> u32             // Decimal places
pub fn total_supply(env: Env) -> i128        // Total supply
pub fn balance(env: Env, owner: Address) -> i128  // Account balance
```

---

## Proposal Lifecycle

```
        ┌──────────────┐
        │    Active    │
        └──────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ Passed │ │Rejected│ │Cancelled │
└────────┘ └────────┘ └──────────┘
    │
    ▼
┌──────────┐
│ Executed │
└──────────┘
```

| Transition | Trigger | Caller | Condition |
|------------|---------|--------|-----------|
| Active → Passed | `finalise()` | Anyone | `total_votes >= quorum AND yes > no` |
| Active → Rejected | `finalise()` | Anyone | quorum not met OR `yes <= no` |
| Active → Cancelled | `cancel()` | Admin | — |
| Passed → Executed | `execute()` | Admin | — |

---

## Storage & Data Structures

### Governance — Instance Storage

| Key | Type | Purpose |
|-----|------|---------|
| `Admin` | `Address` | Admin address |
| `VotingToken` | `Address` | Governance token address |
| `ProposalCount` | `u64` | Monotonic proposal ID counter |
| `MinProposalBalance` | `i128` | Minimum balance to propose |
| `ProposalCooldown` | `u64` | Seconds between proposals |
| `RestrictAdminVote` | `bool` | Admin vote restriction flag |
| `Paused` | `bool` | Contract pause state |

### Governance — Persistent Storage

| Key | Type | Purpose |
|-----|------|---------|
| `Proposal(id)` | `Proposal` | Full proposal state |
| `HasVoted(id, voter)` | `bool` | Double-vote guard |
| `VoteRecord(id, voter)` | `VoteRecord` | Vote type + weight |
| `LastProposal(proposer)` | `u64` | Cooldown timestamp |

---

## Configuration

```bash
cp .env.example .env
# Edit .env with your values
```

Key variables: `NETWORK`, `STELLAR_RPC_URL`, `STELLAR_SECRET_KEY`, `GOVERNANCE_CONTRACT_ID`, `TOKEN_CONTRACT_ID`.

---

## Development

### With Docker

```bash
docker compose up
docker compose run --rm dev make test
docker compose run --rm dev make build
```

### Without Docker

```bash
rustup target add wasm32-unknown-unknown
make test
make build
make lint
```

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make test` | Run all tests |
| `make build` | Build WASM binaries |
| `make lint` | Run Clippy |
| `make fmt` | Format code |
| `make clean` | Remove build artifacts |
| `make ci` | Full CI check |

---

## Testing

```bash
make test                          # All tests
cargo test -p cosmosvote-governance  # Governance only
cargo test -p cosmosvote-token       # Token only
cargo test prop_                   # Property-based tests
```

---

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability disclosure policy and [docs/security/](./docs/security/) for the full threat model.

### Pause Mechanism

The contract includes a pause mechanism for emergency response. When the contract is **paused**:
- **Blocked:** `create_proposal`, `cast_vote`, `finalise`.
- **Allowed:** `execute`, `cancel`, `unpause`, `transfer_admin`, `accept_admin`, `update_quorum`.

Key security properties:
- `require_auth()` on all state-changing operations
- Double-vote prevention via persistent `HasVoted` flag
- Arithmetic overflow protection via `checked_add`
- Contract pause mechanism for emergency response
- One-time initialization guard

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Quick checklist:

1. Fork → feature branch → changes → `make test` → `make lint` → PR

---

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Soroban SDK](https://docs.rs/soroban-sdk/)
- [SEP-41 Token Standard](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md)
- [Architecture Decision Records](./docs/adr/)
- [Security Documentation](./docs/security/)

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).

---

Built with ❤️ on Stellar

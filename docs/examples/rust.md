# Rust Integration Examples

## Setup

Add to your `Cargo.toml`:

```toml
[dependencies]
soroban-sdk = "22.0.0"
```

## Full Governance Flow

```rust
use soroban_sdk::{Address, Env, String};

// 1. Initialize token
TokenContract::initialize(env, admin.clone(), 1_000_000_000)?;

// 2. Mint tokens to voters
TokenContract::mint(env, admin.clone(), voter_a.clone(), 10_000_000)?;
TokenContract::mint(env, admin.clone(), voter_b.clone(), 5_000_000)?;

// 3. Initialize governance
GovernanceContract::initialize(
    env,
    admin.clone(),
    token_address.clone(),
    1_000_000,  // min balance to propose
    86_400,     // 1 day cooldown
    true,       // restrict admin voting
)?;

// 4. Create a proposal
let proposal_id = GovernanceContract::create_proposal(
    env,
    proposer.clone(),
    String::from_str(&env, "Upgrade Protocol"),
    String::from_str(&env, "Upgrade CosmosVote to v2 with execution payloads"),
    5_000_000,  // 5M quorum
    604_800,    // 7 days
)?;

// 5. Cast votes
GovernanceContract::cast_vote(env, voter_a.clone(), proposal_id, Vote::Yes)?;
GovernanceContract::cast_vote(env, voter_b.clone(), proposal_id, Vote::No)?;

// 6. Check vote status
let voted = GovernanceContract::has_voted(env, proposal_id, voter_a.clone());
let record = GovernanceContract::get_vote(env, proposal_id, voter_a.clone())?;
// record.vote == Vote::Yes, record.weight == 10_000_000

// 7. Finalize after voting period
// (advance ledger past end_time first)
GovernanceContract::finalise(env, proposal_id)?;

// 8. Execute if passed
let proposal = GovernanceContract::get_proposal(env, proposal_id)?;
if proposal.state == ProposalState::Passed {
    GovernanceContract::execute(env, admin.clone(), proposal_id)?;
}
```

## Admin Operations

```rust
// Pause contract
GovernanceContract::pause(env, admin.clone())?;

// Unpause
GovernanceContract::unpause(env, admin.clone())?;

// Update quorum on active proposal
GovernanceContract::update_quorum(env, admin.clone(), proposal_id, 3_000_000)?;

// Transfer admin
GovernanceContract::transfer_admin(env, admin.clone(), new_admin.clone())?;

// Cancel active proposal with reason
GovernanceContract::cancel(env, admin.clone(), proposal_id, Some(String::from_str(env, "Bug is not relevant")))?;

// Cancel active proposal without a reason
GovernanceContract::cancel(env, admin.clone(), proposal_id, None)?;
```

## Token Operations

```rust
// Transfer tokens
TokenContract::transfer(env, from.clone(), to.clone(), 1_000_000)?;

// Approve allowance with expiry ledger
let expiry_ledger = env.ledger().sequence() + 10;
TokenContract::approve(env, owner.clone(), spender.clone(), 5_000_000, expiry_ledger)?;

// Transfer from allowance
TokenContract::transfer_from(env, spender.clone(), owner.clone(), recipient.clone(), 2_000_000)?;

// Burn tokens
TokenContract::burn(env, admin.clone(), holder.clone(), 500_000)?;
```

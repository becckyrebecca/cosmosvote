//! Governance contract — instruction count benchmarks.
//!
//! Measures CPU instruction consumption for key operations.
//! Baselines are stored in docs/performance.md.
//! CI fails if any operation exceeds baseline by more than 10%.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{types::Vote, GovernanceContract, GovernanceContractClient};
use cosmosvote_token::{TokenContract, TokenContractClient};

// ---------------------------------------------------------------------------
// Instruction count baselines (must not be exceeded by more than 10%)
// ---------------------------------------------------------------------------

const BASELINE_CREATE_PROPOSAL: u64 = 5_000_000;
const BASELINE_CAST_VOTE: u64 = 5_000_000;
const BASELINE_FINALISE: u64 = 5_000_000;

fn threshold(baseline: u64) -> u64 {
    baseline + baseline / 10 // baseline * 1.10
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

fn setup_env() -> (Env, GovernanceContractClient<'static>, TokenContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let proposer = Address::generate(&env);

    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(&env, &token_id);
    token.initialize(&admin, &1_000_000_000_000i128);
    token.mint(&admin, &proposer, &10_000_000i128);

    let gov_id = env.register(GovernanceContract, ());
    let gov = GovernanceContractClient::new(&env, &gov_id);
    gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false, &None);

    let id = gov.create_proposal(
        &proposer,
        &String::from_str(&env, "Vote Benchmark"),
        &String::from_str(&env, "Measuring instruction count for cast_vote"),
        &1_000_000i128,
        &604_800u64,
        &None,
    );

    let voter = Address::generate(&env);
    token.mint(&admin, &voter, &1_000i128);

    env.budget().reset_default();
    gov.cast_vote(&voter, &id, &Vote::Yes);
    let instructions = env.budget().instructions_consumed();

    assert!(
        instructions <= threshold(BASELINE_CAST_VOTE),
        "cast_vote used {} instructions, exceeds 10% over baseline {}",
        instructions,
        BASELINE_CAST_VOTE
    );
}

#[test]
fn bench_finalise() {
    let (env, gov, token, admin, proposer) = setup_env();

    let id = gov.create_proposal(
        &proposer,
        &String::from_str(&env, "Finalise Benchmark"),
        &String::from_str(&env, "Measuring instruction count for finalise"),
        &1_000_000i128,
        &604_800u64,
    );

    let voter = Address::generate(&env);
    token.mint(&admin, &voter, &1_000_000i128);
    gov.cast_vote(&voter, &id, &Vote::Yes);

    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);

    env.budget().reset_default();
    gov.finalise(&id);
    let instructions = env.budget().instructions_consumed();

    assert!(
        instructions <= threshold(BASELINE_FINALISE),
        "finalise used {} instructions, exceeds 10% over baseline {}",
        instructions,
        BASELINE_FINALISE
    );
}

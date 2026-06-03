//! Governance contract — property-based tests.
//!
//! These tests verify invariants that must hold for any valid input.

#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String};

use crate::{
    types::{ProposalState, Vote},
    GovernanceContract, GovernanceContractClient,
};
use cosmosvote_token::{TokenContract, TokenContractClient};

fn _arb_vote() -> impl Strategy<Value = Vote> {
    prop_oneof![Just(Vote::Yes), Just(Vote::No), Just(Vote::Abstain)]
}

proptest! {
    /// A voter can never vote twice on the same proposal.
    #[test]
    fn prop_no_double_vote(
        yes_weight in 1_000_000i128..50_000_000i128,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let voter = Address::generate(&env);

        let token_id = env.register(TokenContract, ());
        let token = TokenContractClient::new(&env, &token_id);
        token.initialize(
            &admin,
            &1_000_000_000i128,
            &String::from_str(&env, "CosmosVote"),
            &String::from_str(&env, "VOTE"),
            &7u32,
        );
        token.mint(&admin, &voter, &yes_weight);

        let gov_id = env.register(GovernanceContract, ());
        let gov = GovernanceContractClient::new(&env, &gov_id);
        gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false, &None);

        let id = gov.create_proposal(
            &voter,
            &String::from_str(&env, "Prop"),
            &String::from_str(&env, "Description"),
            &(yes_weight / 2),
            &3600u64,
            &None,
        );

        gov.cast_vote(&voter, &id, &Vote::Yes);
        prop_assert!(gov.has_voted(&id, &voter));

        let result = gov.try_cast_vote(&voter, &id, &Vote::No);
        prop_assert!(result.is_err());
    }

    /// Total votes on a proposal never exceed total token supply.
    #[test]
    fn prop_votes_never_exceed_supply(
        supply in 10_000_000i128..1_000_000_000i128,
        weight_a in 1_000_000i128..9_000_000i128,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let voter_a = Address::generate(&env);
        let voter_b = Address::generate(&env);

        // Clamp weight_a to supply
        let weight_a = weight_a.min(supply - 1);
        let weight_b = supply - weight_a;

        let token_id = env.register(TokenContract, ());
        let token = TokenContractClient::new(&env, &token_id);
        token.initialize(
            &admin,
            &supply,
            &String::from_str(&env, "CosmosVote"),
            &String::from_str(&env, "VOTE"),
            &7u32,
        );
        token.mint(&admin, &voter_a, &weight_a);
        token.mint(&admin, &voter_b, &weight_b);

        let gov_id = env.register(GovernanceContract, ());
        let gov = GovernanceContractClient::new(&env, &gov_id);
        gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false, &None);

        let id = gov.create_proposal(
            &voter_a,
            &String::from_str(&env, "Supply Test"),
            &String::from_str(&env, "Verify vote totals"),
            &(supply / 2),
            &3600u64,
            &None,
        );

        gov.cast_vote(&voter_a, &id, &Vote::Yes);
        gov.cast_vote(&voter_b, &id, &Vote::No);

        let proposal = gov.get_proposal(&id);
        let total = proposal.votes_yes + proposal.votes_no + proposal.votes_abstain;
        prop_assert!(total <= supply);
    }

    /// A proposal that passes always has votes_yes > votes_no and total >= quorum.
    #[test]
    fn prop_pass_conditions_correct(
        yes_weight in 6_000_000i128..10_000_000i128,
        no_weight in 1_000_000i128..4_000_000i128,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let voter_yes = Address::generate(&env);
        let voter_no = Address::generate(&env);

        let token_id = env.register(TokenContract, ());
        let token = TokenContractClient::new(&env, &token_id);
        token.initialize(
            &admin,
            &1_000_000_000i128,
            &String::from_str(&env, "CosmosVote"),
            &String::from_str(&env, "VOTE"),
            &7u32,
        );
        token.mint(&admin, &voter_yes, &yes_weight);
        token.mint(&admin, &voter_no, &no_weight);

        let gov_id = env.register(GovernanceContract, ());
        let gov = GovernanceContractClient::new(&env, &gov_id);
        gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false, &None);

        let quorum = yes_weight + no_weight - 1;
        let id = gov.create_proposal(
            &voter_yes,
            &String::from_str(&env, "Pass Test"),
            &String::from_str(&env, "Should pass"),
            &quorum,
            &3600u64,
            &None,
        );

        gov.cast_vote(&voter_yes, &id, &Vote::Yes);
        gov.cast_vote(&voter_no, &id, &Vote::No);

        let proposal = gov.get_proposal(&id);
        env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
        gov.finalise(&id);

        let final_proposal = gov.get_proposal(&id);
        if yes_weight > no_weight {
            prop_assert_eq!(final_proposal.state, ProposalState::Passed);
        } else {
            prop_assert_eq!(final_proposal.state, ProposalState::Rejected);
        }
    }
}

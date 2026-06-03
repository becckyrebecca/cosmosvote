//! Governance contract — on-chain event emission.

use soroban_sdk::{symbol_short, Address, Env, String};

use crate::types::{ProposalState, Vote};

pub struct GovernanceEvents;

impl GovernanceEvents {
    pub fn initialized(env: &Env, admin: &Address, token: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("init")),
            (admin.clone(), token.clone()),
        );
    }

    pub fn proposal_created(
        env: &Env,
        id: u64,
        proposer: &Address,
        title: &String,
        quorum: i128,
        end_time: u64,
    ) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("created")),
            (id, proposer.clone(), title.clone(), quorum, end_time),
        );
    }

    pub fn vote_cast(env: &Env, proposal_id: u64, voter: &Address, vote: &Vote, weight: i128) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("voted")),
            (proposal_id, voter.clone(), vote.clone(), weight),
        );
    }

    /// Emitted exactly once per proposal when `finalise()` transitions it from
    /// `Active` to `Passed` or `Rejected`. Off-chain indexers should deduplicate
    /// on `(proposal_id, "final")` — the idempotency guard in `finalise()`
    /// prevents a second emission, but indexers processing historical ledgers
    /// should still treat duplicate events as no-ops.
    pub fn proposal_finalized(env: &Env, proposal_id: u64, state: &ProposalState) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("final")),
            (proposal_id, state.clone()),
        );
    }

    pub fn proposal_executed(env: &Env, proposal_id: u64, admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("exec")),
            (proposal_id, admin.clone()),
        );
    }

    pub fn proposal_cancelled(env: &Env, proposal_id: u64, admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("cancel")),
            (proposal_id, admin.clone()),
        );
    }

    pub fn quorum_updated(env: &Env, proposal_id: u64, old_quorum: i128, new_quorum: i128) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("quorum")),
            (proposal_id, old_quorum, new_quorum),
        );
    }

    pub fn admin_transferred(env: &Env, old_admin: &Address, new_admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("admin")),
            (old_admin.clone(), new_admin.clone()),
        );
    }

    pub fn admin_transfer_proposed(env: &Env, current_admin: &Address, pending_admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("propose")),
            (current_admin.clone(), pending_admin.clone()),
        );
    }

    pub fn admin_transfer_accepted(env: &Env, previous_admin: &Address, new_admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("accept")),
            (previous_admin.clone(), new_admin.clone()),
        );
    }

    pub fn proposal_amended(
        env: &Env,
        proposal_id: u64,
        proposer: &Address,
        old_title: &String,
        new_title: &String,
        old_description: &String,
        new_description: &String,
    ) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("amended")),
            (
                proposal_id,
                proposer.clone(),
                old_title.clone(),
                new_title.clone(),
                old_description.clone(),
                new_description.clone(),
            ),
        );
    }

    pub fn paused(env: &Env, admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("paused")),
            admin.clone(),
        );
    }

    pub fn unpaused(env: &Env, admin: &Address) {
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("unpause")),
            admin.clone(),
        );
    }
}

//! CosmosVote Governance Contract
//! CosmosVote Governance Contract
//! Manages the full proposal lifecycle: creation, voting, finalization,
//! execution, and cancellation. Enforces quorum, prevents double-voting,
//! and emits on-chain events for every state transition.

#![no_std]

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;
#[cfg(test)]
mod test_helpers;
#[cfg(test)]
mod prop_tests;
#[cfg(test)]
mod benchmarks;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

use events::GovernanceEvents;
use storage::GovernanceStorage;
use types::{ContractError, ContractState, GovernanceConfig, Proposal, ProposalState, Vote, VoteRecord};

// ---------------------------------------------------------------------------
// Token interface (cross-contract call)
// ---------------------------------------------------------------------------

mod token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "TokenClient")]
    pub trait TokenInterface {
        fn balance(env: Env, owner: Address) -> i128;
        fn total_supply(env: Env) -> i128;
    }
}

pub(crate) use token_interface::TokenClient;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize the governance contract.
    ///
    /// * `admin`                – privileged address (execute / cancel / pause)
    /// * `voting_token`         – SEP-41 governance token address
    /// * `min_proposal_balance` – minimum token balance to create proposals (0 = none)
    /// * `proposal_cooldown`    – seconds between proposals per address (0 = none)
    /// * `min_quorum_bps`       – minimum quorum floor in basis points (100 = 1%)
    /// * `restrict_admin_vote`  – if true, admin cannot vote on own proposals
    pub fn initialize(
        env: Env,
        admin: Address,
        voting_token: Address,
        min_proposal_balance: i128,
        proposal_cooldown: u64,
        min_quorum_bps: u32,
        restrict_admin_vote: bool,
    ) -> Result<(), ContractError> {
        if GovernanceStorage::contract_state(&env) != ContractState::Uninitialized {
            return Err(ContractError::AlreadyInitialized);
        }

        GovernanceStorage::set_admin(&env, &admin);
        GovernanceStorage::set_voting_token(&env, &voting_token);
        GovernanceStorage::set_proposal_count(&env, 0);
        GovernanceStorage::set_min_proposal_balance(&env, min_proposal_balance);
        GovernanceStorage::set_proposal_cooldown(&env, proposal_cooldown);
        GovernanceStorage::set_min_quorum_bps(&env, min_quorum_bps);
        GovernanceStorage::set_restrict_admin_vote(&env, restrict_admin_vote);
        GovernanceStorage::set_paused(&env, false);
        GovernanceStorage::set_contract_state(&env, ContractState::Ready);
        GovernanceStorage::set_version(&env, (1, 0, 0));

        GovernanceEvents::initialized(&env, &admin, &voting_token);
        Ok(())
    }

    /// Retrieve the current governance configuration.
    pub fn get_config(env: Env) -> GovernanceConfig {
        GovernanceConfig {
            admin: GovernanceStorage::admin(&env),
            voting_token: GovernanceStorage::voting_token(&env),
            min_proposal_balance: GovernanceStorage::min_proposal_balance(&env),
            proposal_cooldown: GovernanceStorage::proposal_cooldown(&env),
            restrict_admin_vote: GovernanceStorage::restrict_admin_vote(&env),
            paused: GovernanceStorage::paused(&env),
        }
    }

    // -----------------------------------------------------------------------
    // Proposal management
    // -----------------------------------------------------------------------

    /// Create a new governance proposal.
    ///
    /// Returns the new proposal ID.
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        quorum: i128,
        duration: u64,
    ) -> Result<u64, ContractError> {
        proposer.require_auth();
        Self::assert_ready(&env)?;

        // Validate inputs
        if title.len() == 0 || title.len() > 128 {
            return Err(ContractError::InvalidTitle);
        }
        if description.len() == 0 || description.len() > 1024 {
            return Err(ContractError::InvalidDescription);
        }
        if quorum <= 0 {
            return Err(ContractError::InvalidQuorum);
        }
        if duration < 60 || duration > 2_592_000 {
            return Err(ContractError::InvalidDurationRange);
        }

        let token = GovernanceStorage::voting_token(&env);
        let token_client = TokenClient::new(&env, &token);
        let total_supply = token_client.total_supply();

        if quorum > total_supply {
            return Err(ContractError::QuorumExceedsSupply);
        }

        // Quorum floor check
        let min_quorum_bps = GovernanceStorage::min_quorum_bps(&env);
        if min_quorum_bps > 0 {
            let floor = total_supply
                .checked_mul(min_quorum_bps as i128)
                .and_then(|v| v.checked_div(10_000))
                .ok_or(ContractError::ArithmeticOverflow)?;
            
            if quorum < floor {
                return Err(ContractError::QuorumBelowFloor);
            }
        }

        // Balance check
        let min_balance = GovernanceStorage::min_proposal_balance(&env);
        if min_balance > 0 {
            let bal = token_client.balance(&proposer);
            if bal < min_balance {
                return Err(ContractError::InsufficientBalance);
            }
        }

        // Cooldown check
        let cooldown = GovernanceStorage::proposal_cooldown(&env);
        if cooldown > 0 {
            let now = env.ledger().timestamp();
            if let Some(last) = GovernanceStorage::last_proposal_time(&env, &proposer) {
                if now < last + cooldown {
                    return Err(ContractError::ProposalCooldown);
                }
            }
        }

        let now = env.ledger().timestamp();
        let snapshot_ledger = env.ledger().sequence();
        let id = GovernanceStorage::proposal_count(&env);
        let proposal = Proposal {
            id,
            proposer: proposer.clone(),
            title: title.clone(),
            description: description.clone(),
            votes_yes: 0,
            votes_no: 0,
            votes_abstain: 0,
            quorum,
            start_time: now,
            end_time: now + duration,
            state: ProposalState::Active,
            snapshot_ledger,
        };

        GovernanceStorage::set_proposal(&env, id, &proposal);
        GovernanceStorage::set_proposal_count(&env, id + 1);
        GovernanceStorage::set_last_proposal_time(&env, &proposer, now);

        GovernanceEvents::proposal_created(&env, id, &proposer, &title, quorum, now + duration);
        Ok(id)
    }

    /// Retrieve a proposal by ID.
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, ContractError> {
        GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)
    }

    /// Total number of proposals created.
    pub fn proposal_count(env: Env) -> u64 {
        GovernanceStorage::proposal_count(&env)
    }

    /// Paginated list of proposals.
    pub fn get_proposals(env: Env, from_id: u64, limit: u32) -> Vec<Proposal> {
        let count = GovernanceStorage::proposal_count(&env);
        let limit = if limit > 20 { 20 } else { limit };
        let mut proposals = Vec::new(&env);

        let end = (from_id + limit as u64).min(count);
        for id in from_id..end {
            if let Some(proposal) = GovernanceStorage::proposal(&env, id) {
                proposals.push_back(proposal);
            }
        }
        proposals
    }

    /// Paginated list of proposals filtered by state.
    pub fn get_proposals_by_state(
        env: Env,
        state: ProposalState,
        from_id: u64,
        limit: u32,
    ) -> Vec<Proposal> {
        let count = GovernanceStorage::proposal_count(&env);
        let limit = if limit > 20 { 20 } else { limit };
        let mut proposals = Vec::new(&env);

        let mut current_id = from_id;
        while proposals.len() < limit && current_id < count {
            if let Some(proposal) = GovernanceStorage::proposal(&env, current_id) {
                if proposal.state == state {
                    proposals.push_back(proposal);
                }
            }
            current_id += 1;
        }
        proposals
    }

    // -----------------------------------------------------------------------
    // Voting
    // -----------------------------------------------------------------------

    /// Cast a vote on an active proposal.
    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        vote: Vote,
    ) -> Result<(), ContractError> {
        voter.require_auth();
        Self::assert_ready(&env)?;

        let mut proposal = GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)?;

        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }

        let now = env.ledger().timestamp();
        if now < proposal.start_time {
            return Err(ContractError::VotingNotStarted);
        }
        if now > proposal.end_time {
            return Err(ContractError::VotingPeriodEnded);
        }

        if GovernanceStorage::has_voted(&env, proposal_id, &voter) {
            return Err(ContractError::AlreadyVoted);
        }

        // Admin vote restriction
        if GovernanceStorage::restrict_admin_vote(&env) {
            let admin = GovernanceStorage::admin(&env);
            if voter == admin && proposal.proposer == admin {
                return Err(ContractError::AdminVoteRestricted);
            }
        }

        let token = GovernanceStorage::voting_token(&env);
        let weight = TokenClient::new(&env, &token).balance_at(&voter, proposal.snapshot_ledger);
        if weight <= 0 {
            return Err(ContractError::NoVotingPower);
        }

        match vote {
            Vote::Yes => proposal.votes_yes = proposal.votes_yes.checked_add(weight)
                .ok_or(ContractError::ArithmeticOverflow)?,
            Vote::No => proposal.votes_no = proposal.votes_no.checked_add(weight)
                .ok_or(ContractError::ArithmeticOverflow)?,
            Vote::Abstain => proposal.votes_abstain = proposal.votes_abstain.checked_add(weight)
                .ok_or(ContractError::ArithmeticOverflow)?,
        }

        GovernanceStorage::set_has_voted(&env, proposal_id, &voter, true);
        GovernanceStorage::set_vote_record(&env, proposal_id, &voter, &VoteRecord { vote: vote.clone(), weight });
        GovernanceStorage::set_proposal(&env, proposal_id, &proposal);

        GovernanceEvents::vote_cast(&env, proposal_id, &voter, &vote, weight);
        Ok(())
    }

    /// Returns true if the voter has already voted on this proposal.
    pub fn has_voted(env: Env, proposal_id: u64, voter: Address) -> bool {
        GovernanceStorage::has_voted(&env, proposal_id, &voter)
    }

    /// Retrieve the vote record for a voter on a proposal.
    pub fn get_vote(
        env: Env,
        proposal_id: u64,
        voter: Address,
    ) -> Result<VoteRecord, ContractError> {
        GovernanceStorage::vote_record(&env, proposal_id, &voter)
            .ok_or(ContractError::VoteNotFound)
    }

    // -----------------------------------------------------------------------
    // Finalization & execution
    // -----------------------------------------------------------------------

    /// Finalize a proposal after its voting period ends.
    /// Anyone may call this.
    pub fn finalise(env: Env, proposal_id: u64) -> Result<(), ContractError> {
        Self::assert_ready(&env)?;

        let mut proposal = GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)?;

        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }

        let now = env.ledger().timestamp();
        if now <= proposal.end_time {
            return Err(ContractError::VotingStillOpen);
        }

        let total_votes = proposal.votes_yes
            .checked_add(proposal.votes_no)
            .and_then(|v| v.checked_add(proposal.votes_abstain))
            .ok_or(ContractError::ArithmeticOverflow)?;

        let passed = total_votes >= proposal.quorum && proposal.votes_yes > proposal.votes_no;
        proposal.state = if passed { ProposalState::Passed } else { ProposalState::Rejected };

        GovernanceStorage::set_proposal(&env, proposal_id, &proposal);
        GovernanceEvents::proposal_finalized(&env, proposal_id, &proposal.state);
        Ok(())
    }

    /// Execute a passed proposal. Admin only.
    pub fn execute(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        let mut proposal = GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)?;

        if proposal.state != ProposalState::Passed {
            return Err(ContractError::ProposalNotPassed);
        }

        proposal.state = ProposalState::Executed;
        GovernanceStorage::set_proposal(&env, proposal_id, &proposal);
        GovernanceEvents::proposal_executed(&env, proposal_id, &admin);
        Ok(())
    }

    /// Cancel an active proposal. Admin only.
    pub fn cancel(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        let mut proposal = GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)?;

        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }

        proposal.state = ProposalState::Cancelled;
        GovernanceStorage::set_proposal(&env, proposal_id, &proposal);
        GovernanceEvents::proposal_cancelled(&env, proposal_id, &admin);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Admin operations
    // -----------------------------------------------------------------------

    /// Update the quorum on an active proposal. Admin only.
    pub fn update_quorum(
        env: Env,
        admin: Address,
        proposal_id: u64,
        new_quorum: i128,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        if new_quorum <= 0 {
            return Err(ContractError::InvalidQuorum);
        }

        let token = GovernanceStorage::voting_token(&env);
        let supply = TokenClient::new(&env, &token).total_supply();
        if new_quorum > supply {
            return Err(ContractError::QuorumExceedsSupply);
        }

        let mut proposal = GovernanceStorage::proposal(&env, proposal_id)
            .ok_or(ContractError::ProposalNotFound)?;

        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }

        let total_votes = proposal.votes_yes
            .checked_add(proposal.votes_no)
            .and_then(|v| v.checked_add(proposal.votes_abstain))
            .ok_or(ContractError::ArithmeticOverflow)?;

        if total_votes > 0 {
            return Err(ContractError::QuorumUpdateNotAllowed);
        }

        let old_quorum = proposal.quorum;
        proposal.quorum = new_quorum;
        GovernanceStorage::set_proposal(&env, proposal_id, &proposal);
        GovernanceEvents::quorum_updated(&env, proposal_id, old_quorum, new_quorum);
        Ok(())
    }

    /// Initiate a two-step admin transfer. Current admin only.
    /// The new admin must call `accept_admin` to complete the transfer.
    /// This pattern prevents accidental admin loss and supports multisig accounts.
    pub fn transfer_admin(
        env: Env,
        admin: Address,
        new_admin: Address,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        GovernanceStorage::set_pending_admin(&env, Some(&new_admin));
        GovernanceEvents::admin_transfer_initiated(&env, &admin, &new_admin);
        Ok(())
    }

    /// Accept admin privileges. Called by the pending admin to complete the transfer.
    pub fn accept_admin(env: Env, pending_admin: Address) -> Result<(), ContractError> {
        pending_admin.require_auth();

        let current_pending = GovernanceStorage::pending_admin(&env)
            .ok_or(ContractError::NoPendingAdmin)?;

        if pending_admin != current_pending {
            return Err(ContractError::NotPendingAdmin);
        }

        let previous_admin = GovernanceStorage::admin(&env);
        GovernanceStorage::set_admin(&env, &pending_admin);
        GovernanceStorage::set_pending_admin(&env, None);
        GovernanceEvents::admin_transfer_completed(&env, &previous_admin, &pending_admin);
        Ok(())
    }

    /// Pause all state-changing operations. Admin only.
    pub fn pause(env: Env, admin: Address) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        if GovernanceStorage::paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        GovernanceStorage::set_paused(&env, true);
        GovernanceEvents::paused(&env, &admin);
        Ok(())
    }

    /// Unpause the contract. Admin only.
    pub fn unpause(env: Env, admin: Address) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        if !GovernanceStorage::paused(&env) {
            return Err(ContractError::NotPaused);
        }
        GovernanceStorage::set_paused(&env, false);
        GovernanceEvents::unpaused(&env, &admin);
        Ok(())
    }

    /// Return the current admin address.
    pub fn admin(env: Env) -> Address {
        GovernanceStorage::admin(&env)
    }

    /// Return the pending admin address, if any.
    pub fn pending_admin(env: Env) -> Option<Address> {
        GovernanceStorage::pending_admin(&env)
    }

    /// Return the contract version.
    pub fn version(env: Env) -> (u32, u32, u32) {
        GovernanceStorage::version(&env)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn assert_ready(env: &Env) -> Result<(), ContractError> {
        if GovernanceStorage::contract_state(env) != ContractState::Ready {
            return Err(ContractError::NotInitialized);
        }
        if GovernanceStorage::paused(env) {
            return Err(ContractError::ContractPaused);
        }
        Ok(())
    }

    fn assert_admin(env: &Env, caller: &Address) -> Result<(), ContractError> {
        if GovernanceStorage::admin(env) != *caller {
            return Err(ContractError::NotAdmin);
        }
        Ok(())
    }
}

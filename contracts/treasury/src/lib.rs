//! CosmosVote Treasury Contract
//!
//! Holds XLM and tokens on behalf of the DAO. The governance contract
//! calls `disburse` to execute a TreasuryAction from a passed proposal.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Asset identifier — XLM (native) or a SEP-41 token address.
#[contracttype]
#[derive(Clone, Debug)]
pub enum Asset {
    Native,
    Token(Address),
}

/// Payload embedded in a proposal describing a treasury disbursement.
#[contracttype]
#[derive(Clone, Debug)]
pub struct TreasuryAction {
    pub recipient: Address,
    pub amount: i128,
    pub asset: Asset,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Governance,
}

// ---------------------------------------------------------------------------
// Token interface for SEP-41 transfers
// ---------------------------------------------------------------------------

mod token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "TokenClient")]
    pub trait TokenInterface {
        fn transfer(env: Env, from: Address, to: Address, amount: i128);
    }
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// One-time initializer. `governance` is the only address allowed to call `disburse`.
    pub fn initialize(env: Env, governance: Address) {
        if env.storage().instance().has(&DataKey::Governance) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Governance, &governance);
    }

    /// Disburse funds according to a TreasuryAction. Only callable by governance.
    pub fn disburse(env: Env, action: TreasuryAction) {
        let governance: Address = env.storage().instance().get(&DataKey::Governance).unwrap();
        governance.require_auth();

        match action.asset {
            Asset::Native => {
                let client = token::StellarAssetClient::new(&env, &env.current_contract_address());
                client.transfer(&env.current_contract_address(), &action.recipient, &action.amount);
            }
            Asset::Token(token_addr) => {
                let client = token_interface::TokenClient::new(&env, &token_addr);
                client.transfer(env.current_contract_address(), action.recipient, action.amount);
            }
        }

        env.events().publish(
            (soroban_sdk::symbol_short!("disburse"),),
            (action.recipient, action.amount),
        );
    }

    /// Return the governance address.
    pub fn governance(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Governance).unwrap()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_initialize_and_governance() {
        let env = Env::default();
        let contract_id = env.register(TreasuryContract, ());
        let client = TreasuryContractClient::new(&env, &contract_id);

        let governance = Address::generate(&env);
        client.initialize(&governance);
        assert_eq!(client.governance(), governance);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let contract_id = env.register(TreasuryContract, ());
        let client = TreasuryContractClient::new(&env, &contract_id);

        let governance = Address::generate(&env);
        client.initialize(&governance);
        client.initialize(&governance);
    }
}

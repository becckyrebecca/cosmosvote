//! Token contract — unit tests.

#![cfg(test)]

use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String};

use crate::{types::ContractError, TokenContract, TokenContractClient};

fn setup(env: &Env) -> (TokenContractClient, Address, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let user = Address::generate(env);
    let id = env.register(TokenContract, ());
    let token = TokenContractClient::new(env, &id);
    token.initialize(
        &admin,
        &1_000_000_000i128,
        &String::from_slice(env, "CosmosVote"),
        &String::from_slice(env, "VOTE"),
        &7u32,
    );
    (token, admin, user)
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

#[test]
fn test_initialize() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    assert_eq!(token.total_supply(), 1_000_000_000);
    assert_eq!(token.balance(&admin), 1_000_000_000);
}

#[test]
fn test_double_init_fails() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    let result = token.try_initialize(
        &admin,
        &1_000_000i128,
        &String::from_slice(&env, "Coin"),
        &String::from_slice(&env, "COIN"),
        &7u32,
    );
    assert_eq!(result, Err(Ok(ContractError::AlreadyInitialized)));
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

#[test]
fn test_transfer() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer(&admin, &user, &1_000_000i128);
    assert_eq!(token.balance(&user), 1_000_000);
    assert_eq!(token.balance(&admin), 999_000_000);
}

#[test]
fn test_transfer_insufficient_balance_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_transfer(&user, &Address::generate(&env), &1i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_transfer_zero_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let result = token.try_transfer(&admin, &user, &0i128);
    assert_eq!(result, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn test_transfer_to_self_noop() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    token.transfer(&admin, &admin, &1_000_000i128);
    assert_eq!(token.balance(&admin), 1_000_000_000);
}

// ---------------------------------------------------------------------------
// Allowances
// ---------------------------------------------------------------------------

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    let expiry = env.ledger().sequence() + 10;
    token.approve(&admin, &spender, &5_000_000i128, &expiry);
    assert_eq!(token.allowance(&admin, &spender), 5_000_000);
    token.transfer_from(&spender, &admin, &user, &2_000_000i128);
    assert_eq!(token.balance(&user), 2_000_000);
    assert_eq!(token.allowance(&admin, &spender), 3_000_000);
}

#[test]
fn test_transfer_from_exceeds_allowance_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    let expiry = env.ledger().sequence() + 10;
    token.approve(&admin, &spender, &100i128, &expiry);
    let result = token.try_transfer_from(&spender, &admin, &user, &200i128);
    assert_eq!(result, Err(Ok(ContractError::AllowanceExceeded)));
}

#[test]
fn test_transfer_from_expired_allowance_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    let expiry = env.ledger().sequence() + 1;
    token.approve(&admin, &spender, &1_000_000i128, &expiry);
    env.ledger().with_mut(|l| l.sequence_number = expiry + 1);
    let result = token.try_transfer_from(&spender, &admin, &user, &1_000_000i128);
    assert_eq!(result, Err(Ok(ContractError::AllowanceExceeded)));
}

// ---------------------------------------------------------------------------
// Mint & burn
// ---------------------------------------------------------------------------

#[test]
fn test_mint() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.mint(&admin, &user, &5_000_000i128);
    assert_eq!(token.balance(&user), 5_000_000);
    assert_eq!(token.total_supply(), 1_005_000_000);
}

#[test]
fn test_burn() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    token.burn(&admin, &admin, &100_000_000i128);
    assert_eq!(token.total_supply(), 900_000_000);
    assert_eq!(token.balance(&admin), 900_000_000);
}

#[test]
fn test_burn_insufficient_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let result = token.try_burn(&admin, &user, &1i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_burn_self() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);

    token.transfer(&admin, &user, &1_000_000i128);
    token.burn_self(&user, &500_000i128);

    assert_eq!(token.balance(&user), 500_000);
    assert_eq!(token.total_supply(), 999_500_000);
}

#[test]
fn test_burn_self_insufficient_balance_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_burn_self(&user, &1_000_000i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_mint_non_admin_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_mint(&user, &user, &1_000i128);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

#[test]
fn test_burn_reduces_total_supply() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    token.burn(&admin, &admin, &200_000_000i128);
    assert_eq!(token.total_supply(), 800_000_000);
    assert_eq!(token.balance(&admin), 800_000_000);
}

#[test]
fn test_burn_insufficient_balance_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let result = token.try_burn(&admin, &user, &1i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_burn_non_admin_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer(&admin, &user, &1_000_000i128);
    let result = token.try_burn(&user, &user, &1_000_000i128);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

// ---------------------------------------------------------------------------
// Admin transfer
// ---------------------------------------------------------------------------

#[test]
fn test_admin_transfer_happy_path() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    
    // Step 1: Propose
    token.propose_admin(&admin, &user);
    assert_eq!(token.admin(), admin); // Still old admin
    
    // Step 2: Accept
    token.accept_admin(&user);
    assert_eq!(token.admin(), user); // Now new admin
}

#[test]
fn test_propose_admin_non_admin_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_propose_admin(&user, &Address::generate(&env));
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

#[test]
fn test_accept_admin_not_pending_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    
    let result = token.try_accept_admin(&user);
    assert_eq!(result, Err(Ok(ContractError::NoPendingAdmin)));

    token.propose_admin(&admin, &user);
    let random = Address::generate(&env);
    let result = token.try_accept_admin(&random);
    assert_eq!(result, Err(Ok(ContractError::NotPendingAdmin)));
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

#[test]
fn test_version() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.version(), (1u32, 0u32, 0u32));

    env.as_contract(&token.address, || {
        crate::storage::TokenStorage::set_version(&env, (2, 1, 0));
    });
    assert_eq!(token.version(), (2u32, 1u32, 0u32));
}

// ---------------------------------------------------------------------------
// SEP-41 Metadata
// ---------------------------------------------------------------------------

#[test]
fn test_name() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.name(), String::from_slice(&env, "CosmosVote"));
}

#[test]
fn test_symbol() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.symbol(), String::from_slice(&env, "VOTE"));
}

#[test]
fn test_decimals() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.decimals(), 7u32);
}

// ---------------------------------------------------------------------------
// Delegation
// ---------------------------------------------------------------------------

#[test]
fn test_delegate_and_get_delegation() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let delegate = Address::generate(&env);

    token.transfer(&admin, &user, &1_000_000i128);
    token.delegate(&user, &delegate);

    assert_eq!(token.get_delegation(&user), Some(delegate));
}

#[test]
fn test_delegate_self_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer(&admin, &user, &1_000_000i128);

    let result = token.try_delegate(&user, &user);
    assert_eq!(result, Err(Ok(ContractError::CannotDelegateSelf)));
}

#[test]
fn test_delegate_twice_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let delegate = Address::generate(&env);
    let delegate2 = Address::generate(&env);

    token.transfer(&admin, &user, &1_000_000i128);
    token.delegate(&user, &delegate);

    let result = token.try_delegate(&user, &delegate2);
    assert_eq!(result, Err(Ok(ContractError::AlreadyDelegating)));
}

#[test]
fn test_undelegate() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let delegate = Address::generate(&env);

    token.transfer(&admin, &user, &1_000_000i128);
    token.delegate(&user, &delegate);
    token.undelegate(&user);

    assert_eq!(token.get_delegation(&user), None);
}

#[test]
fn test_undelegate_without_delegation_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);

    let result = token.try_undelegate(&user);
    assert_eq!(result, Err(Ok(ContractError::NotDelegating)));
}

#[test]
fn test_get_delegated_weight_no_delegators() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer(&admin, &user, &5_000_000i128);

    let weight = token.get_delegated_weight(&user, &soroban_sdk::Vec::new(&env));
    assert_eq!(weight, 5_000_000);
}

#[test]
fn test_get_delegated_weight_with_delegator() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let delegator = Address::generate(&env);

    token.transfer(&admin, &user, &5_000_000i128);
    token.mint(&admin, &delegator, &3_000_000i128);
    token.delegate(&delegator, &user);

    let mut delegators = soroban_sdk::Vec::new(&env);
    delegators.push_back(delegator);
    let weight = token.get_delegated_weight(&user, &delegators);
    assert_eq!(weight, 8_000_000); // 5M own + 3M delegated
}

#[test]
fn test_get_delegated_weight_ignores_wrong_delegator() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let other = Address::generate(&env);
    let unrelated = Address::generate(&env);

    token.transfer(&admin, &user, &5_000_000i128);
    token.mint(&admin, &other, &2_000_000i128);
    // other delegates to unrelated, not to user
    token.delegate(&other, &unrelated);

    let mut delegators = soroban_sdk::Vec::new(&env);
    delegators.push_back(other);
    let weight = token.get_delegated_weight(&user, &delegators);
    assert_eq!(weight, 5_000_000); // only own balance
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

#[test]
fn test_metadata_name() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.name(), String::from_str(&env, "CosmosVote Token"));
}

#[test]
fn test_metadata_symbol() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.symbol(), String::from_str(&env, "CVT"));
}

#[test]
fn test_metadata_decimals() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.decimals(), 7u32);
}

#[test]
fn test_metadata_custom_values() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(TokenContract, ());
    let token = TokenContractClient::new(&env, &id);
    token.initialize(
        &admin,
        &500_000i128,
        &String::from_str(&env, "My Token"),
        &String::from_str(&env, "MTK"),
        &18u32,
    );
    assert_eq!(token.name(), String::from_str(&env, "My Token"));
    assert_eq!(token.symbol(), String::from_str(&env, "MTK"));
    assert_eq!(token.decimals(), 18u32);
}

// ---------------------------------------------------------------------------
// Pause / unpause
// ---------------------------------------------------------------------------

#[test]
fn test_pause_blocks_transfer() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.pause(&admin);
    assert!(token.is_paused());
    let result = token.try_transfer(&admin, &user, &1_000i128);
    assert_eq!(result, Err(Ok(ContractError::ContractPaused)));
}

#[test]
fn test_pause_blocks_transfer_from() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    token.approve(&admin, &spender, &1_000i128);
    token.pause(&admin);
    let result = token.try_transfer_from(&spender, &admin, &user, &100i128);
    assert_eq!(result, Err(Ok(ContractError::ContractPaused)));
}

#[test]
fn test_unpause_restores_transfer() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.pause(&admin);
    token.unpause(&admin);
    assert!(!token.is_paused());
    token.transfer(&admin, &user, &1_000i128);
    assert_eq!(token.balance(&user), 1_000);
}

#[test]
fn test_pause_non_admin_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_pause(&user);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

#[test]
fn test_unpause_non_admin_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.pause(&admin);
    let result = token.try_unpause(&user);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

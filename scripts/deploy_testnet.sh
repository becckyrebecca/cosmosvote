#!/usr/bin/env bash
# deploy_testnet.sh — Deploy CosmosVote contracts to Stellar testnet (staging).
#
# This is the required staging step before any mainnet deployment.
# Run smoke tests after deployment to validate before promoting to mainnet.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

STELLAR_SECRET_KEY="${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY must be set}"
INITIAL_TOKEN_SUPPLY="${INITIAL_TOKEN_SUPPLY:-1000000000}"
TOKEN_NAME="${TOKEN_NAME:-CosmosVote}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-VOTE}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-7}"
MIN_PROPOSAL_BALANCE="${MIN_PROPOSAL_BALANCE:-0}"
PROPOSAL_COOLDOWN="${PROPOSAL_COOLDOWN:-0}"
RESTRICT_ADMIN_VOTE="${RESTRICT_ADMIN_VOTE:-false}"

PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"

echo "=== CosmosVote — Testnet Deployment (Staging) ==="
echo "RPC URL : $RPC_URL"
echo ""

echo ">>> Building WASM binaries..."
cd "$ROOT_DIR"
cargo build --release --target wasm32-unknown-unknown

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

echo "WASM hashes (record these before promoting to mainnet):"
sha256sum "$TOKEN_WASM"
sha256sum "$GOV_WASM"
echo ""

ADMIN_ADDRESS=$(stellar keys address --secret-key "$STELLAR_SECRET_KEY" 2>/dev/null || \
  stellar keys address "$STELLAR_SECRET_KEY")
echo "Admin: $ADMIN_ADDRESS"

echo ">>> Deploying token contract to testnet..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "Token contract ID: $TOKEN_CONTRACT_ID"

stellar contract invoke \
  --id "$TOKEN_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --initial_supply "$INITIAL_TOKEN_SUPPLY" \
  --name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --decimals "$TOKEN_DECIMALS"

echo ">>> Deploying governance contract to testnet..."
GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$GOV_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --voting_token "$TOKEN_CONTRACT_ID" \
  --min_proposal_balance "$MIN_PROPOSAL_BALANCE" \
  --proposal_cooldown "$PROPOSAL_COOLDOWN" \
  --restrict_admin_vote "$RESTRICT_ADMIN_VOTE"

echo ""
echo "=== Testnet deployment complete ==="
echo "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
echo ""
echo "Next: run smoke tests, then promote to mainnet with deploy_mainnet.sh"

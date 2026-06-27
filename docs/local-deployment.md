# Local Soroban Contract Deployment Guide

This guide walks through deploying CosmosVote contracts to a local Soroban environment for development and iteration.

## Prerequisites

```bash
# Rust with WASM target
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Docker (for local Soroban node)
docker --version
```

## 1. Start a Local Soroban Node

```bash
docker compose up -d
```

This starts a local Stellar/Soroban node at `http://localhost:8000`.

Verify it is running:

```bash
curl http://localhost:8000/info
```

## 2. Build WASM Binaries

```bash
make build
```

Artifacts are written to `target/wasm32-unknown-unknown/release/`.

Run tests before deploying:

```bash
make test
```

## 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` for local deployment:

```bash
NETWORK=local
STELLAR_RPC_URL=http://localhost:8000
STELLAR_SECRET_KEY=<your-local-keypair-secret>
```

Generate a local keypair if needed:

```bash
stellar keys generate --global alice --network local
stellar keys address alice
```

Fund the account on local network:

```bash
stellar keys fund alice --network local
```

## 4. Deploy Contracts

```bash
./scripts/deploy.sh
```

The script deploys the token contract first, then the governance contract, and prints both contract IDs. Copy them into your `.env`:

```bash
TOKEN_CONTRACT_ID=<printed-token-id>
GOVERNANCE_CONTRACT_ID=<printed-governance-id>
```

## 5. Run Tests and Build WASM

```bash
# All tests
make test

# Governance contract only
cargo test -p cosmosvote-governance --features testutils

# Token contract only
cargo test -p cosmosvote-token --features testutils

# Property-based tests
cargo test prop_ --all --features testutils

# Verify WASM builds
bash scripts/test_wasm.sh
```

## 6. Interact with Deployed Contracts

Initialize the governance contract after deploy:

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source alice \
  --network local \
  -- initialize \
  --admin alice \
  --voting_token "$TOKEN_CONTRACT_ID" \
  --min_proposal_balance 0 \
  --proposal_cooldown 0 \
  --restrict_admin_vote false
```

Create a proposal:

```bash
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source alice \
  --network local \
  -- create_proposal \
  --proposer alice \
  --title "My First Proposal" \
  --description "Testing local deployment" \
  --quorum 1000 \
  --duration 3600
```

## 7. Teardown

```bash
docker compose down
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `STELLAR_SECRET_KEY must be set` | Set the variable in `.env` |
| `connection refused` on port 8000 | Run `docker compose up -d` first |
| WASM build fails | Run `rustup target add wasm32-unknown-unknown` |
| `Error: account not found` | Fund the account with `stellar keys fund alice --network local` |
| Contracts already deployed | Re-run `./scripts/deploy.sh`; it will deploy fresh instances |
| Test failures after contract change | Run `make clean && make build && make test` |

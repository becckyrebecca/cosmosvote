# WASM Size Budget

CosmosVote CI enforces a maximum binary size for each compiled contract.

## Budget

| Contract | Budget |
|----------|--------|
| `cosmosvote_governance.wasm` | 100 KB (102 400 bytes) |
| `cosmosvote_token.wasm` | 100 KB (102 400 bytes) |

## Rationale

- **Soroban upload limit** — Soroban enforces a hard limit on WASM upload size. Staying at 100 KB leaves substantial headroom below that ceiling.
- **Transaction fees** — Larger WASMs increase upload fees. Keeping binaries small benefits deployers on testnet and mainnet.
- **Regression detection** — A CI gate catches accidental size increases from added dependencies or generated code before they reach `main`.

## CI enforcement

The `Enforce WASM size budget` step in `.github/workflows/ci.yml` (inside the `build` job) iterates over every `cosmosvote_*.wasm` artifact and fails if any exceeds the budget.

## Reducing binary size

If a contract exceeds the budget:

1. Run `wasm-opt -Os` (from [binaryen](https://github.com/WebAssembly/binaryen)) on the artifact:
   ```bash
   wasm-opt -Os target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm \
     -o target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm
   ```
2. Audit new dependencies — prefer `no_std`-compatible, minimal crates.
3. Remove unused features from `Cargo.toml` dependency declarations.
4. If growth is justified, open a PR to raise the budget with a written rationale.

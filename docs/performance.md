# Performance & Instruction Count Budget

Soroban charges fees based on CPU instruction counts. This document records the baseline instruction counts for key governance operations and defines the CI regression gate.

## Instruction Count Baselines

These baselines are stored in `contracts/governance/src/benchmarks.rs` as constants. CI fails if any operation exceeds its baseline by more than 10%.

| Operation | Baseline (instructions) | CI Limit (+10%) |
|-----------|------------------------|-----------------|
| `create_proposal` | 5,000,000 | 5,500,000 |
| `cast_vote` | 5,000,000 | 5,500,000 |
| `finalise` | 5,000,000 | 5,500,000 |

Soroban's per-transaction limit is **100,000,000 instructions**. All governance operations consume well under 10% of that budget.

## Scaling Analysis

- **`create_proposal`**: O(1) — reads token supply once, writes one proposal record.
- **`cast_vote`**: O(1) — reads voter balance at snapshot ledger, writes vote record and updated proposal totals. Cost does not grow with total voter count.
- **`finalise`**: O(1) — reads proposal totals (accumulated during voting), performs arithmetic checks, writes one state update.

## Running Benchmarks Locally

```bash
cargo test bench_ --features testutils -- --nocapture
```

This prints instruction counts for each operation and asserts they stay within the 10% regression threshold.

## CI Integration

The `benchmark` job in `.github/workflows/ci.yml` runs `cargo test bench_` on every push and pull request to `main` and `develop`. The job fails if any benchmark assertion fails, blocking the merge.

## Methodology

Benchmarks use the Soroban SDK's `env.budget().reset_default()` and `env.budget().instructions_consumed()` to measure the exact instruction count of each operation in isolation. Each benchmark:

1. Sets up a fresh environment with deployed contracts
2. Resets the budget immediately before the operation under test
3. Reads the consumed instruction count after the call
4. Asserts the count is within the allowed threshold

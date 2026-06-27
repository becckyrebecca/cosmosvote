# Instruction Count Budgets

Soroban transactions are subject to a **CPU instruction limit** imposed by the Stellar network. Exceeding this limit causes the transaction to fail with an `ExceededLimit` error. This document records the instruction budget baselines for the three core governance flows and explains how they are enforced.

## Soroban Transaction Limit

The Stellar network enforces a per-transaction CPU instruction limit. As of Stellar Protocol 21, the limit is:

| Resource | Limit |
|----------|-------|
| CPU instructions per transaction | 100,000,000 (100M) |

All governance operations are well within this ceiling. The baselines below are conservative targets that leave headroom for future feature additions.

## Baseline Budgets

Baselines are defined as `const u64` in `contracts/governance/src/benchmarks.rs`. Tests fail if the measured instruction count exceeds the baseline by more than **10%**.

| Operation | Baseline (instructions) | Fail threshold (+10%) | Notes |
|-----------|------------------------|----------------------|-------|
| `create_proposal` | 5,000,000 | 5,500,000 | Includes storage writes for proposal + metadata |
| `cast_vote` | 2,000,000 | 2,200,000 | Includes has-voted guard + balance lookup + write |
| `finalise` | 3,000,000 | 3,300,000 | Includes quorum check + state transition + event emit |

## How Benchmarks Work

The benchmark tests in `contracts/governance/src/benchmarks.rs` use Soroban's built-in `env.budget()` API:

```rust
// Reset budget so prior setup calls don't pollute the measurement
env.as_contract(&gov.address, || {
    env.budget().reset_unlimited();
});

let before = env.budget().cpu_instruction_cost();
gov.create_proposal(/* ... */);
let used = env.budget().cpu_instruction_cost() - before;

assert!(used <= threshold(BASELINE_CREATE_PROPOSAL));
```

The `threshold()` helper adds a 10% margin to the baseline, so minor fluctuations in Soroban SDK versions don't cause spurious failures.

## Running the Benchmarks

```bash
# Run all benchmark tests
cargo test -p cosmosvote-governance bench_

# Or via Make
make test
```

Sample output:

```
test benchmarks::bench_create_proposal ... ok
test benchmarks::bench_cast_vote ... ok
test benchmarks::bench_finalise ... ok
```

## Updating Baselines

If a deliberate feature addition increases instruction counts beyond the 10% threshold:

1. Measure the new count by running the benchmark and reading the assertion failure message.
2. Update the corresponding `const BASELINE_*` value in `benchmarks.rs`.
3. Update the table in this document.
4. Add a note in `CHANGELOG.md` describing the change and its cause.

> Baseline increases should be intentional and code-reviewed. An unexpected increase is a signal to investigate the change for unnecessary computation.

## Relationship to Soroban Limits

| Operation | Baseline | % of 100M limit |
|-----------|----------|----------------|
| `create_proposal` | 5,000,000 | 5% |
| `cast_vote` | 2,000,000 | 2% |
| `finalise` | 3,000,000 | 3% |

Even in a worst-case scenario where all three operations are composed in a single test, total instruction usage remains under 10% of the network limit.

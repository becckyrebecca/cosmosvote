# Mutation Testing

CosmosVote uses [cargo-mutants](https://mutants.rs/) to verify that the test suite
actually catches bugs, not just executes code paths.

## What is mutation testing?

The tool makes small, targeted changes to the source code (mutants) — flipping a `>` to
`>=`, removing a `return Err(...)`, etc. — and checks whether the existing tests fail.
A mutant that is **not caught** (a "surviving mutant") indicates a gap in test coverage.

## Running locally

```bash
# Install
cargo install cargo-mutants --locked

# Run against the governance contract
cargo mutants \
  --package cosmosvote-governance \
  --features testutils \
  --output mutants-out \
  -- --features testutils

# View results
cat mutants-out/missed.txt   # surviving mutants (test gaps)
cat mutants-out/caught.txt   # caught mutants (good coverage)
```

## CI integration

Mutation testing runs automatically on every push to `main` and on PRs that touch
`contracts/governance/src/lib.rs` or `contracts/governance/src/test.rs`.

Results are uploaded as a CI artifact (`mutants-report`) for 14 days.

## Baseline mutation score

| Metric | Value |
|--------|-------|
| Tool | cargo-mutants |
| Target | `cosmosvote-governance` core logic |
| Baseline run | Pending first CI execution |
| Surviving mutants | To be documented after first run |

> Update this table after the first CI run by reviewing the `mutants-report` artifact.

## Addressing surviving mutants

For each surviving mutant in `mutants-out/missed.txt`:

1. Understand what the mutant changes (the diff is shown inline).
2. Add a targeted test that would catch that change.
3. Re-run `cargo mutants` to confirm the mutant is now caught.

Common patterns that produce surviving mutants:

- Off-by-one boundary conditions (e.g., `>` vs `>=` in time checks)
- Error paths that are reachable but not asserted in tests
- Arithmetic edge cases (zero, max values)

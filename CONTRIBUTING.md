# Contributing to CosmosVote

Thank you for your interest in contributing to CosmosVote! This document explains how to get involved.

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## How to Contribute

### Reporting Bugs

Open a GitHub Issue with:
- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Rust version and OS

### Suggesting Features

Open a GitHub Discussion or Issue tagged `enhancement`. Describe the use case and proposed API.

### Submitting Code

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/cosmosvote.git`
3. **Create a branch**: `git checkout -b feat/your-feature-name`
4. **Make your changes**
5. **Run the full check suite**:
   ```bash
   make fmt
   make lint
   make test
   make build
   ```
6. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add proposal delegation support
   fix: prevent quorum bypass on abstain-only votes
   docs: update lifecycle diagram
   test: add edge case for zero-balance voter
   ```
7. **Push** your branch: `git push origin feat/your-feature-name`
8. **Open a Pull Request** against `main`

## Smart Contract Development

### Adding a new contract function
- Add the public function in `contracts/<contract>/src/lib.rs`.
- Add any required storage accessors in `contracts/<contract>/src/storage.rs`.
- Add new errors to `contracts/<contract>/src/types.rs` when needed.
- Add on-chain events in `contracts/<contract>/src/events.rs` for state changes.
- Privileged functions must call `require_auth()` and validate inputs.

### Writing unit tests
- Add unit tests in `contracts/<contract>/src/test.rs`.
- Use `Env::default()` and `env.mock_all_auths()`.
- Register the contract client, initialize it, and exercise the new API.
- Test both success and failure conditions using `try_*` helpers.
- Verify state changes with `assert_eq!` and event behavior where applicable.

### Adding property tests
- Add property-based tests in `contracts/<contract>/src/prop_tests.rs`.
- Use `proptest::prelude::*` and clear invariants.
- Keep property tests focused on safety invariants such as no double-vote, supply limits, or authorization guarantees.
- Use `prop_assert!` / `prop_assert_eq!` for assertions.

### Updating events
- Add new event emission methods in `contracts/<contract>/src/events.rs`.
- Emit events for every meaningful state transition or admin action.
- Use consistent event symbols and payload ordering.

### Updating storage
- Update `InstanceKey`, `PersistentKey`, or `TempKey` enums in `contracts/<contract>/src/storage.rs`.
- Add helper getters/setters for new storage fields.
- Keep storage keys stable and avoid changing existing keys unless necessary.

## Code Review Checklist for Contract PRs
- [ ] Public contract API changes are documented
- [ ] Authorization is enforced on privileged entry points
- [ ] Input validation is implemented for all new functions
- [ ] State updates are covered by unit tests
- [ ] Failure cases are covered by `try_*` tests
- [ ] Property tests are added or updated for contract invariants
- [ ] Events are emitted for relevant state changes
- [ ] Storage schema changes are tracked in storage helpers
- [ ] Documentation and README are updated if needed
- [ ] `make fmt`, `make lint`, and `make test` pass

## Pull Request Requirements

- [ ] All tests pass (`make test`)
- [ ] No Clippy warnings (`make lint`)
- [ ] Code is formatted (`make fmt-check`)
- [ ] New features include tests
- [ ] Bug fixes include a regression test
- [ ] Documentation updated if public API changed
- [ ] CHANGELOG.md updated under `[Unreleased]`

## Branch Protection Rules

The `main` branch is protected. Direct pushes to `main` are disabled. To merge changes into `main`, the following rules are enforced:
- **Require a pull request before merging:** All changes must be made through a PR.
- **Require approvals:** At least 1 review approval is required.
- **Require status checks to pass before merging:** CI checks (build, test, lint) must pass.
- **Do not allow bypassing the above settings:** Administrators must also follow these rules.
- **Restrict force pushes:** Force pushes to `main` are not allowed.

### Enabling Branch Protection (For Admins)
To configure these rules via GitHub repository settings:
1. Go to the repository **Settings** > **Branches**.
2. Click **Add branch protection rule**.
3. Set **Branch name pattern** to `main`.
4. Check **Require a pull request before merging**, and set **Require approvals** to 1.
5. Check **Require status checks to pass before merging** and require your CI checks.
6. Check **Do not allow bypassing the above settings**.
7. Ensure **Allow force pushes** is unchecked.
8. Click **Create** or **Save changes**.

## Coding Standards

- Follow existing code style and module structure
- Use `checked_add` / `checked_sub` for all arithmetic on token amounts
- All public contract functions must call `require_auth()` on the caller
- Storage keys must use the established `InstanceKey` / `PersistentKey` / `TempKey` enums
- Emit events for every state transition
- Error codes must be added to `ContractError` with a unique `u32` discriminant

## Testing Requirements

- Unit tests go in `src/test.rs`
- Test helpers go in `src/test_helpers.rs`
- Property-based tests go in `src/prop_tests.rs`
- Use `env.mock_all_auths()` in tests
- Test both success and failure paths for every public function
- **Coverage Target:** All contributions must maintain at least **80% code coverage**. The CI will fail if coverage drops below this threshold.

## Security

If you discover a security vulnerability, **do not open a public issue**. See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Questions

Open a GitHub Discussion or reach out via the issue tracker.

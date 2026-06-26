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

## Code Style & Repository Conventions

### Rust

- Format all Rust code with `rustfmt` before committing (`make fmt`).
- No Clippy warnings are allowed; fix all warnings before opening a PR (`make lint`).
- Use `snake_case` for functions and variables, `PascalCase` for types and enums, `SCREAMING_SNAKE_CASE` for constants.
- Keep functions focused — prefer small, single-responsibility functions.
- Use `checked_add` / `checked_sub` for arithmetic on any numeric value that can overflow.
- Return `Result<T, ContractError>` from all fallible contract entry points.
- Avoid `unwrap()` / `expect()` in contract code; propagate errors with `?`.
- Document public functions with a `///` doc comment explaining purpose, parameters, and errors.

```rust
// Good
/// Returns the current proposal count.
pub fn proposal_count(env: Env) -> u64 {
    storage::get_proposal_count(&env)
}

// Bad — no doc, uses unwrap
pub fn proposal_count(env: Env) -> u64 {
    env.storage().instance().get(&InstanceKey::ProposalCount).unwrap()
}
```

### TypeScript (Frontend)

- All files must pass ESLint with zero warnings: `npm run lint` from `frontend/`.
- All files must type-check: `npm run type-check`.
- Use `camelCase` for variables and functions, `PascalCase` for types, interfaces, and React components.
- Prefer `interface` over `type` for object shapes; use `type` for unions and aliases.
- Use explicit return types on exported functions.
- Avoid `any`; use `unknown` and narrow types explicitly.
- Use `async/await` over `.then()` chains.

```typescript
// Good
export async function fetchProposalCount(): Promise<number> {
  const count = await simulateCall(config.governanceContractId, 'proposal_count');
  return Number(count);
}

// Bad — implicit any, no return type
export async function fetchProposalCount() {
  const count: any = await simulateCall(config.governanceContractId, 'proposal_count');
  return count;
}
```

### Shell Scripts

- All scripts must start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Quote all variable expansions: `"${VAR}"` not `$VAR`.
- Use `snake_case` for local variables and function names.
- Add a brief comment above each logical block explaining what it does.
- Do not hard-code secrets or keys; read them from environment variables.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deploy governance contract to the configured network
stellar contract deploy \
  --wasm "${WASM_PATH}" \
  --source "${STELLAR_SECRET_KEY}" \
  --network "${NETWORK}"
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/proposal-delegation` |
| Bug fix | `fix/<short-description>` | `fix/quorum-bypass` |
| Documentation | `docs/<short-description>` | `docs/api-reference` |
| Chore / tooling | `chore/<short-description>` | `chore/update-deps` |
| Release | `release/v<version>` | `release/v1.2.0` |

- Use lowercase letters, numbers, and hyphens only — no underscores or slashes beyond the prefix.
- Keep names concise (≤ 40 characters after the prefix).

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body>

<optional footer: Closes #issue>
```

Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `ci`.

```
# Good
feat(governance): add proposal delegation support

Allows token holders to delegate voting power to another address.

Closes #42

# Bad
updated stuff
```

- Keep the subject line ≤ 72 characters.
- Use the imperative mood: "add", "fix", "update" — not "added", "fixed", "updated".
- Reference the issue number in the footer: `Closes #<number>`.

### Pull Request Expectations

- Target `main` branch.
- Title follows the same Conventional Commits format as commit messages.
- Description must include: **What** changed, **Why**, and **How to test**.
- Link the relevant issue with `Closes #<number>` in the PR description.
- Keep PRs focused — one issue or feature per PR.
- Self-review your diff before requesting review.
- Ensure `make fmt`, `make lint`, and `make test` all pass locally before pushing.

### Lint Rules Summary

| Language | Tool | Command | Config |
|----------|------|---------|--------|
| Rust | Clippy | `make lint` | `clippy.toml` / inline `#[allow]` |
| Rust | rustfmt | `make fmt` | `rustfmt.toml` |
| TypeScript | ESLint | `npm run lint` (in `frontend/`) | `.eslintrc` |
| TypeScript | tsc | `npm run type-check` | `tsconfig.json` |

## Testing Requirements

- Unit tests go in `src/test.rs`
- Test helpers go in `src/test_helpers.rs`
- Property-based tests go in `src/prop_tests.rs`
- Use `env.mock_all_auths()` in tests
- Test both success and failure paths for every public function

## Security

If you discover a security vulnerability, **do not open a public issue**. See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Questions

Open a GitHub Discussion or reach out via the issue tracker.

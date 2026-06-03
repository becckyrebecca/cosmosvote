# Vote Delegation

CosmosVote supports **simple (liquid democracy-style) delegation**: a token holder can delegate their voting power to a trusted representative without transferring their tokens.

## Model

- **One-level delegation only** — A delegates to B. B votes with their own balance. A cannot vote while delegated.
- **Tokens stay in the owner's wallet** — delegation is a separate on-chain record; balances are unaffected.
- **One active delegation at a time** — an owner must `undelegate` before delegating to a different address.
- **Delegate votes with their own balance** — the governance contract uses `get_delegated_weight(voter, delegators)` to accumulate weight. Since Soroban has no reverse-lookup, the caller must supply the list of delegators. For the current on-chain flow, each voter's weight equals their own balance; off-chain indexers can supply delegator lists for richer weight calculation.

## Token Contract API

### `delegate(owner, delegate_to) → Result<(), ContractError>`

Delegates `owner`'s voting power to `delegate_to`.

- `owner` must sign (`require_auth`)
- `owner != delegate_to` (cannot delegate to self)
- `owner` must not already have an active delegation

**Errors:** `CannotDelegateSelf` (30), `AlreadyDelegating` (31)

### `undelegate(owner) → Result<(), ContractError>`

Removes the active delegation, restoring `owner`'s direct voting power.

- `owner` must sign (`require_auth`)
- `owner` must have an active delegation

**Errors:** `NotDelegating` (32)

### `get_delegation(owner) → Option<Address>`

Returns the current delegate for `owner`, or `None` if not delegating.

### `get_delegated_weight(voter, delegators: Vec<Address>) → i128`

Returns `voter`'s own balance plus the balances of any `delegators` who have delegated to `voter`. Delegators whose stored delegate does not match `voter` are ignored.

## Governance Behavior

- **Delegators cannot vote directly.** If `voter` has an active delegation, `cast_vote` returns `NoVotingPower`.
- **Delegates vote with their own balance.** The governance contract calls `get_delegated_weight(voter, [])` (empty delegator list), so the weight equals the voter's own balance. To include delegated weight, an off-chain caller can supply the delegator list.
- **Undelegating restores voting power** immediately for future proposals.

## Example Flow

```
Alice (10M tokens) delegates to Bob (5M tokens)
Bob creates a proposal and votes Yes
  → Bob's weight = 5M (own balance only, on-chain)
  → Alice cannot vote on this proposal

Alice undelegates
Alice votes Yes on a new proposal
  → Alice's weight = 10M
```

## Events

| Event topic | Data | Description |
|-------------|------|-------------|
| `(token, delegate)` | `(owner, delegate_to)` | Delegation created |
| `(token, undelegt)` | `owner` | Delegation removed |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 30 | `CannotDelegateSelf` | Owner tried to delegate to themselves |
| 31 | `AlreadyDelegating` | Owner already has an active delegation |
| 32 | `NotDelegating` | Undelegate called with no active delegation |

# ADR-007: restrict_admin_vote Semantics

**Status:** Accepted  
**Date:** 2026-05-29

## Context

The `restrict_admin_vote` flag was originally implemented to prevent the admin from voting on proposals they created (`voter == admin && proposer == admin`). Issue #14 identified that this is a weaker restriction than most governance systems intend: an admin can still influence any proposal created by others.

## Decision

When `restrict_admin_vote` is `true`, the admin is blocked from voting on **all** proposals, regardless of who created them. The check is:

```rust
if GovernanceStorage::restrict_admin_vote(&env) {
    let admin = GovernanceStorage::admin(&env);
    if voter == admin {
        return Err(ContractError::AdminVoteRestricted);
    }
}
```

When `restrict_admin_vote` is `false` (the default), the admin may vote on any proposal without restriction.

## Consequences

- Stronger separation of powers: the admin role (execute/cancel/pause) is fully separated from voting when the flag is set.
- Deployers who want the admin to participate in voting should set `restrict_admin_vote = false` at initialization.
- The previous partial restriction (own proposals only) is removed; there is no middle ground.

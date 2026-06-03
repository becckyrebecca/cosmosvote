# ADR-003: Snapshot Voting with Balance at Proposal Creation

**Status:** Accepted  
**Date:** 2026-05-17  
<!-- . -->
**Revised:** 2026-05-29

## Context

Token-weighted voting requires capturing each voter's balance. Two approaches exist:
1. **Pre-snapshot**: Record all balances at proposal creation time
2. **Live balance**: Fetch balance at the moment of voting

The original decision (ADR-003 v1) was to use live balance for simplicity. However, this enables an attack vector: a whale could accumulate tokens, vote, and immediately sell (or coordinate a flash-accumulation attack across blocks).

## Decision

Use snapshot voting: capture the current ledger sequence number at proposal creation time, and fetch voting power using `balance_at(owner, snapshot_ledger)` at vote time. The snapshot is immutable after proposal creation.

## Rationale

**Original Live Balance Approach:**
- Simple to implement
- O(1) per voter
- Mitigates flash-loan attacks (loan must be repaid before transaction ends)

**Updated Snapshot Approach:**
- Prevents whale attack: attacker cannot accumulate tokens after proposal creation and vote with them
- Prevents coordinated token hoarding: multiple parties cannot accumulate balance between blocks
- Vote weight is deterministic: given the proposal's snapshot_ledger, the voting power is deterministic regardless of when voting occurs
- Storage overhead: one u32 field per proposal (snapshot_ledger)
- Requires token contract to implement `balance_at(owner, ledger)` — already implemented via BalanceSnapshot storage

## Consequences

- Voting power is fixed at proposal creation, not vote time
- A voter who acquires tokens after proposal creation cannot vote with those tokens
- A voter who sells tokens after proposal creation still retains their voting power from the snapshot
- Flash-accumulation attacks are prevented: attacker must accumulate before proposal creation
- Whale attacks are prevented: large token buyers cannot instantly vote by accumulating post-creation

## Migration Path

Existing systems using ADR-003 v1 (live balance) should:
1. Update governance contract to store snapshot_ledger at proposal creation
2. Update cast_vote to use balance_at(voter, proposal.snapshot_ledger)
3. Verify token contract has BalanceSnapshot storage (already present)
4. Add tests demonstrating attack vectors and their mitigation

## References

- Token contract balance_at implementation: `contracts/token/src/storage.rs`
- Integration tests demonstrating snapshot voting behavior


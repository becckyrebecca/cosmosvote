# Proposal Lifecycle

## State Diagram

```
        ┌──────────────┐
        │    Active    │  ← created by proposer
        └──────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ Passed │ │Rejected│ │Cancelled │
└────────┘ └────────┘ └──────────┘
    │
    ▼
┌──────────┐
│ Executed │
└──────────┘
```

## State Transitions

| From | To | Trigger | Caller | Condition |
|------|----|---------|--------|-----------|
| Active | Passed | `finalise()` | Anyone | `total_votes >= quorum AND yes > no` |
| Active | Rejected | `finalise()` | Anyone | quorum not met OR `yes <= no` |
| Active | Cancelled | `cancel()` | Admin | — |
| Passed | Executed | `execute()` | Admin | — |

## Pass Conditions

```
total_votes = votes_yes + votes_no + votes_abstain

Passed   if total_votes >= quorum  AND  votes_yes > votes_no
Rejected otherwise
```

Key rules:
- Abstain counts toward quorum but not the yes/no outcome
- A tie (`yes == no`) is always rejected
- Voting period is immutable after proposal creation
- Anyone can call `finalise()` after the voting period ends
- Off-chain keepers or GitHub Actions should periodically call `finalise()` on expired proposals so they do not remain stuck in `Active` state.

## Example Lifecycle

```
1. Proposer creates proposal (ID: 0)
   Title: "Upgrade Protocol"
   Duration: 7 days
   Quorum: 5,000,000 tokens
   State: Active

2. Voting period (7 days)
   Voter A: Yes  (weight: 4,000,000)
   Voter B: No   (weight: 1,500,000)
   Voter C: Abstain (weight: 2,000,000)
   Total: 7,500,000 (meets 5M quorum)

3. Anyone calls finalise()
   total_votes = 7,500,000 >= 5,000,000 ✓
   votes_yes (4M) > votes_no (1.5M) ✓
   State: Passed

4. Admin calls execute()
   State: Executed
```

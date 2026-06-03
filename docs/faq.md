# FAQ.

## General

**Q: What blockchain does CosmosVote run on?**
A: Stellar, using the Soroban smart contract platform (Protocol 22+).

**Q: What token standard does CosmosVote use?**
A: The token contract is SEP-41 compatible.

**Q: Can I use an existing token instead of deploying the CosmosVote token?**
A: Yes. The governance contract accepts any SEP-41-compatible token address at initialization.

## Proposals

**Q: Who can create a proposal?**
A: Any address with a token balance >= `min_proposal_balance` (0 = anyone).

**Q: Can a proposal be modified after creation?**
A: No. Title, description, duration, and start/end times are immutable. Only the quorum can be updated by the admin while the proposal is Active.

**Q: What happens if nobody votes?**
A: The proposal will be Rejected at finalization (total_votes = 0 < quorum).

**Q: Can the voting period be extended?**
A: No. Duration is fixed at creation.

## Voting

**Q: How is vote weight calculated?**
A: Vote weight equals the voter's token balance at the time they cast their vote.

**Q: Can I change my vote?**
A: No. Each address can vote exactly once per proposal.

**Q: Do abstain votes count?**
A: Abstain votes count toward quorum but not toward the yes/no outcome.

**Q: What happens on a tie?**
A: A tie (yes == no) results in rejection, even if quorum is met.

## Admin

**Q: What can the admin do?**
A: Execute passed proposals, cancel active proposals, update quorum on active proposals, pause/unpause the contract, and transfer admin privileges.

**Q: Can the admin vote?**
A: By default yes. Set `restrict_admin_vote = true` at initialization to prevent the admin from voting on proposals they created.

**Q: Can the admin alter votes?**
A: No. Vote records are stored in persistent storage and cannot be modified after casting.

## Security

**Q: Is CosmosVote audited?**
A: See [AUDIT.md](../AUDIT.md) for current audit status.

**Q: What happens if the token contract is compromised?**
A: A compromised token contract could return inflated balances. The admin must deploy a trustworthy token. This is a documented accepted risk.

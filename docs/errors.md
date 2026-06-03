# Error Reference

This document maps contract error codes to human-readable messages and provides guidance for developers and frontend teams. Use the error mapping in `frontend/src/errors.ts` to display friendly messages and resolution steps.

## Governance Contract Errors

| Code | Name | Description | Common Cause | Resolution |
|------|------|-------------|--------------|------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized. | Contract initialization was attempted again. | Skip initialization or use the deployed contract. |
| 2 | `NotInitialized` | Contract has not been initialized. | A contract method was called before setup. | Initialize the contract before calling other methods. |
| 10 | `ProposalNotFound` | Proposal ID does not exist. | The proposal ID is invalid or missing. | Confirm the proposal ID and refresh proposal data. |
| 11 | `ProposalNotActive` | Proposal is not active. | Voting was attempted outside the active window. | Only vote on active proposals. |
| 12 | `ProposalNotPassed` | Proposal did not pass. | The proposal failed quorum or majority requirements. | Review results before attempting execution. |
| 13 | `InvalidTitle` | Proposal title is invalid. | Title is empty or too long. | Use a title with 1–128 characters. |
| 14 | `InvalidDescription` | Proposal description is invalid. | Description is empty or too long. | Use a description with 1–1024 characters. |
| 15 | `InvalidQuorum` | Quorum value is invalid. | Quorum is zero, negative, or unsupported. | Set a valid quorum greater than zero. |
| 16 | `QuorumExceedsSupply` | Quorum exceeds total token supply. | Quorum value is too high for current supply. | Choose a lower quorum value. |
| 17 | `InvalidDurationRange` | Voting duration is out of range. | Duration is below 60 seconds or above the maximum. | Use a valid duration in the allowed range. |
| 18 | `InsufficientBalance` | Account balance is too low. | User lacks enough tokens to create or act. | Acquire sufficient balance before retrying. |
| 19 | `ProposalCooldown` | Proposer cooldown is active. | Another proposal was created too recently. | Wait for the cooldown to expire. |
| 20 | `VotingNotStarted` | Voting has not started yet. | A vote was attempted before the voting window opened. | Wait until voting begins. |
| 21 | `VotingPeriodEnded` | Voting period has ended. | A vote was attempted after closure. | Review results instead of voting. |
| 22 | `VotingStillOpen` | Voting is still open. | Finalization was attempted too early. | Wait until voting closes before finalizing. |
| 23 | `AlreadyVoted` | Voter has already voted. | The same account invoked vote twice. | Use a different account or view vote status. |
| 24 | `NoVotingPower` | Account has no voting power. | Account holds zero governance tokens. | Acquire governance tokens before voting. |
| 25 | `AdminVoteRestricted` | Admin vote is restricted. | Admin tried to vote on own proposal. | Use a non-admin account to vote. |
| 26 | `VoteNotFound` | Vote record was not found. | The user has not voted or the ID is wrong. | Verify the proposal and vote status. |
| 30 | `NotAdmin` | Caller is not the admin. | An admin-only action was called by a non-admin. | Use the admin account for this action. |
| 31 | `InvalidNewAdmin` | New admin address is invalid. | An incorrect admin address was supplied. | Provide a valid Stellar admin address. |
| 40 | `ContractPaused` | Contract is paused. | The contract is under maintenance or security hold. | Wait for unpause or contact the admin. |
| 41 | `NotPaused` | Contract is not paused. | An unpause action was called when already active. | Verify contract state before unpausing. |
| 50 | `ArithmeticOverflow` | Numeric overflow occurred. | A contract operation exceeded safe bounds. | Retry with valid values and check contract configuration. |

## Token Contract Errors

| Code | Name | Description | Common Cause | Resolution |
|------|------|-------------|--------------|------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized. | Initialization was attempted again. | Skip initialization. |
| 2 | `NotInitialized` | Contract has not been initialized. | A token action was called before setup. | Initialize the token contract first. |
| 10 | `NotAdmin` | Caller is not the admin. | An admin-only token method was called by a non-admin. | Use the admin account. |
| 11 | `InvalidNewAdmin` | New admin address is invalid. | An invalid Stellar address was provided. | Supply a valid admin address. |
| 20 | `InvalidAmount` | Transfer amount is invalid. | Zero or negative token amount was sent. | Send a positive amount. |
| 21 | `InsufficientBalance` | Sender balance is insufficient. | The account has too few tokens to complete the action. | Top up the account or reduce the amount. |
| 22 | `AllowanceExceeded` | Approved allowance is insufficient. | Transfer-with-allowance exceeded approved funds. | Increase allowance or reduce amount. |

## Frontend Error Mapping

The frontend can use `frontend/src/errors.ts` to map contract error names to friendly messages, causes, and resolutions. This reduces developer effort and improves user-facing error handling.

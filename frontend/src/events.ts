/**
 * CosmosVote on-chain event type definitions.
 *
 * Every Soroban event has the shape:
 *   topics: [contractTag: string, eventTag: string]
 *   data:   typed tuple (or scalar) decoded from XDR ScVal
 *
 * See docs/events.md for the full schema reference.
 */

import type { ProposalState, VoteType } from './types';

// ---------------------------------------------------------------------------
// Governance events  (contract tag: "gov")
// ---------------------------------------------------------------------------

export interface GovInitializedEvent {
  topics: ['gov', 'init'];
  data: { admin: string; token: string };
}

export interface GovProposalCreatedEvent {
  topics: ['gov', 'created'];
  data: {
    id: bigint;
    proposer: string;
    title: string;
    quorum: bigint;
    end_time: bigint;
  };
}

export interface GovVoteCastEvent {
  topics: ['gov', 'voted'];
  data: {
    proposal_id: bigint;
    voter: string;
    vote: VoteType;
    weight: bigint;
  };
}

export interface GovProposalFinalizedEvent {
  topics: ['gov', 'final'];
  data: { proposal_id: bigint; state: Extract<ProposalState, 'Passed' | 'Rejected'> };
}

export interface GovProposalExecutedEvent {
  topics: ['gov', 'exec'];
  data: { proposal_id: bigint; admin: string };
}

export interface GovProposalCancelledEvent {
  topics: ['gov', 'cancel'];
  data: { proposal_id: bigint; admin: string };
}

export interface GovQuorumUpdatedEvent {
  topics: ['gov', 'quorum'];
  data: { proposal_id: bigint; old_quorum: bigint; new_quorum: bigint };
}

export interface GovAdminTransferInitiatedEvent {
  topics: ['gov', 'admint'];
  data: { current_admin: string; pending_admin: string };
}

export interface GovAdminTransferCompletedEvent {
  topics: ['gov', 'admina'];
  data: { previous_admin: string; new_admin: string };
}

export interface GovAdminTransferredEvent {
  topics: ['gov', 'admin'];
  data: { old_admin: string; new_admin: string };
}

export interface GovPausedEvent {
  topics: ['gov', 'paused'];
  data: { admin: string };
}

export interface GovUnpausedEvent {
  topics: ['gov', 'unpause'];
  data: { admin: string };
}

// ---------------------------------------------------------------------------
// Token events  (contract tag: "token")
// ---------------------------------------------------------------------------

export interface TokenInitializedEvent {
  topics: ['token', 'init'];
  data: { admin: string; supply: bigint };
}

export interface TokenTransferEvent {
  topics: ['token', 'xfer'];
  data: { from: string; to: string; amount: bigint };
}

export interface TokenApprovalEvent {
  topics: ['token', 'approve'];
  data: { owner: string; spender: string; amount: bigint };
}

export interface TokenMintedEvent {
  topics: ['token', 'mint'];
  data: { admin: string; to: string; amount: bigint };
}

export interface TokenBurnedEvent {
  topics: ['token', 'burn'];
  data: { admin: string; from: string; amount: bigint };
}

export interface TokenAdminTransferredEvent {
  topics: ['token', 'admin'];
  data: { old_admin: string; new_admin: string };
}

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

export type GovernanceEvent =
  | GovInitializedEvent
  | GovProposalCreatedEvent
  | GovVoteCastEvent
  | GovProposalFinalizedEvent
  | GovProposalExecutedEvent
  | GovProposalCancelledEvent
  | GovQuorumUpdatedEvent
  | GovAdminTransferInitiatedEvent
  | GovAdminTransferCompletedEvent
  | GovAdminTransferredEvent
  | GovPausedEvent
  | GovUnpausedEvent;

export type TokenEvent =
  | TokenInitializedEvent
  | TokenTransferEvent
  | TokenApprovalEvent
  | TokenMintedEvent
  | TokenBurnedEvent
  | TokenAdminTransferredEvent;

export type CosmosVoteEvent = GovernanceEvent | TokenEvent;

// ---------------------------------------------------------------------------
// Topic tag constants — avoids magic strings in consumers
// ---------------------------------------------------------------------------

export const GOV_TAGS = {
  INITIALIZED: 'init',
  PROPOSAL_CREATED: 'created',
  VOTE_CAST: 'voted',
  PROPOSAL_FINALIZED: 'final',
  PROPOSAL_EXECUTED: 'exec',
  PROPOSAL_CANCELLED: 'cancel',
  QUORUM_UPDATED: 'quorum',
  ADMIN_TRANSFER_INITIATED: 'admint',
  ADMIN_TRANSFER_COMPLETED: 'admina',
  ADMIN_TRANSFERRED: 'admin',
  PAUSED: 'paused',
  UNPAUSED: 'unpause',
} as const;

export const TOKEN_TAGS = {
  INITIALIZED: 'init',
  TRANSFER: 'xfer',
  APPROVAL: 'approve',
  MINTED: 'mint',
  BURNED: 'burn',
  ADMIN_TRANSFERRED: 'admin',
} as const;

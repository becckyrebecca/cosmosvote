/** Governance event types emitted by the CosmosVote contract. */
export type GovernanceEventType =
  | 'created'  // (gov, created) — proposal created
  | 'voted'    // (gov, voted)   — vote cast
  | 'final'    // (gov, final)   — proposal finalized
  | 'exec'     // (gov, exec)    — proposal executed
  | 'cancel';  // (gov, cancel)  — proposal cancelled

export interface GovernanceEvent {
  type: GovernanceEventType;
  proposalId?: string;
  ledger: number;
  raw: unknown;
}

/** A subscriber who wants notifications via email and/or webhook. */
export interface Subscriber {
  /** Unique identifier */
  id: string;
  /** Optional: only notify for this proposal ID. Undefined = all proposals. */
  proposalId?: string;
  /** Which event types to receive */
  events: GovernanceEventType[];
  /** Email address (optional) */
  email?: string;
  /** Webhook URL (optional) */
  webhookUrl?: string;
}

/** Persisted state: list of subscribers + last processed Horizon paging token. */
export interface SubscriptionStore {
  subscribers: Subscriber[];
  /** Horizon event paging token — used to resume polling without replaying events. */
  cursor: string;
}

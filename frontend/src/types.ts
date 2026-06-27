// Governance contract types mirroring the Rust contract

export type ProposalState = 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled';
export type VoteType = 'Yes' | 'No' | 'Abstain';

export interface Proposal {
  id: bigint;
  proposer: string;
  title: string;
  description: string;
  cancellation_reason?: string | null;
  votes_yes: bigint;
  votes_no: bigint;
  votes_abstain: bigint;
  quorum: bigint;
  start_time: bigint;
  end_time: bigint;
  state: ProposalState;
}

export interface VoteRecord {
  vote: VoteType;
  weight: bigint;
}

export interface NetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  governanceContractId: string;
  tokenContractId: string;
}

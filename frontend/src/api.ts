import {
  SorobanRpc,
  TransactionBuilder,
  Account,
  Operation,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { config } from './config';
import type { Proposal, VoteRecord } from './types';

const server = new SorobanRpc.Server(config.rpcUrl);

// ---------------------------------------------------------------------------
// Simulation error — distinct from real on-chain failures
// ---------------------------------------------------------------------------

export class SimulationError extends Error {
  constructor(
    message: string,
    public readonly raw: SorobanRpc.Api.SimulateTransactionResponse,
  ) {
    super(message);
    this.name = 'SimulationError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildTx(
  senderOrDummy: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): ReturnType<TransactionBuilder['build']> {
  const account = new Account(senderOrDummy, '0');
  return new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args,
      }),
    )
    .setTimeout(30)
    .build();
}

// Simulate a read-only contract call without a real account
async function simulateCall(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<unknown> {
  // Use a zero-sequence dummy account — valid for simulation only
  const dummyAccount = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
  const tx = buildTx(dummyAccount, contractId, method, args);
  const result = (await server.simulateTransaction(
    tx
  )) as SorobanRpc.Api.SimulateTransactionSuccessResponse;

  if (!result.result) throw new Error(`Simulation failed for ${method}`);
  return scValToNative(result.result.retval);
}

export async function checkRpcReachability(): Promise<void> {
  try {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
    });

    if (!response.ok) {
      throw new Error(`RPC returned HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body.error) {
      throw new Error(`RPC error: ${JSON.stringify(body.error)}`);
    }
  } catch (err) {
    throw new Error(
      `Unable to reach Soroban RPC at ${config.rpcUrl}. Confirm the RPC endpoint is running and that CORS allows browser access. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export async function fetchProposalCount(): Promise<number> {
  const count = await simulateCall(config.governanceContractId, 'proposal_count');
  return Number(count);
}

export async function fetchProposal(id: number): Promise<Proposal> {
  const raw = await simulateCall(
    config.governanceContractId,
    'get_proposal',
    nativeToScVal(BigInt(id), { type: 'u64' })
  );
  return raw as Proposal;
}

export async function fetchAllProposals(
  onProgress?: (loaded: number, total: number) => void
): Promise<Proposal[]> {
  const count = await fetchProposalCount();
  const results = await Promise.allSettled(
    Array.from({ length: count }, (_, i) => fetchProposal(i))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Proposal> => {
      if (r.status === 'rejected') {
        console.error('[fetchAllProposals] failed to fetch proposal:', r.reason);
        return false;
      }
      return true;
    })
    .map(r => r.value);
}

export async function fetchHasVoted(proposalId: number, voter: string): Promise<boolean> {
  const result = await simulateCall(
    config.governanceContractId,
    'has_voted',
    nativeToScVal(BigInt(proposalId), { type: 'u64' }),
    nativeToScVal(voter, { type: 'address' })
  );
  return Boolean(result);
}

export async function fetchVoteRecord(
  proposalId: number,
  voter: string
): Promise<VoteRecord | null> {
  try {
    const result = await simulateCall(
      config.governanceContractId,
      'get_vote',
      nativeToScVal(BigInt(proposalId), { type: 'u64' }),
      nativeToScVal(voter, { type: 'address' })
    );
    return result as VoteRecord;
  } catch {
    return null;
  }
}

export async function fetchTokenBalance(address: string): Promise<bigint> {
  const result = await simulateCall(
    config.tokenContractId,
    'balance',
    nativeToScVal(address, { type: 'address' })
  );
  return BigInt(String(result));
}

export async function fetchTokenDecimals(): Promise<number> {
  const result = await simulateCall(
    config.tokenContractId,
    'decimals'
  );
  return Number(result);
}

export async function castVote(
  walletAddress: string,
  proposalId: number,
  vote: 'Yes' | 'No' | 'Abstain'
): Promise<string> {
  // Create a dummy account for signing (in a real app, this would use the user's actual wallet)
  const dummyAccount = new Account(walletAddress, '0');

  // Convert vote string to enum value
  const voteEnum = { Yes: 0, No: 1, Abstain: 2 }[vote];

  // Build the transaction
  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: config.governanceContractId,
        function: 'cast_vote',
        args: [
          nativeToScVal(walletAddress, { type: 'address' }),
          nativeToScVal(BigInt(proposalId), { type: 'u64' }),
          nativeToScVal(voteEnum, { type: 'u32' }),
        ],
      })
    )
    .setTimeout(30)
    .build();

  // Simulate the transaction to verify it works
  const result = (await server.simulateTransaction(
    tx
  )) as SorobanRpc.Api.SimulateTransactionSuccessResponse;

  if (!result.result) throw new Error('Transaction simulation failed');

  // In a real app, we would sign and submit the transaction here using the actual wallet
  // For now, we return a simulated transaction hash
  return `${result.result.retval}`;
}

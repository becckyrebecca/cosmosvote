# Frontend API Reference

Reference for the contract RPC helpers in `frontend/src/api.ts`. All functions are async and communicate with the Soroban RPC endpoint configured via environment variables.

---

## Setup

```ts
// frontend/src/config.ts resolves the active network from VITE_NETWORK
import { config } from './config';
// config.rpcUrl, config.governanceContractId, config.tokenContractId
```

All helpers use `simulateCall` internally — a read-only Soroban simulation that does not require a signed transaction or a real account.

---

## Internal: `simulateCall`

```ts
async function simulateCall(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<unknown>
```

Builds a Soroban transaction against a dummy account, submits it via `SorobanRpc.Server.simulateTransaction`, and returns the decoded native value.

- Uses a zero-sequence dummy account — valid for read-only simulation only.
- Throws if the simulation result is missing (e.g., method not found or contract error).

---

## Governance Contract Helpers

### `fetchProposalCount`

```ts
export async function fetchProposalCount(): Promise<number>
```

Returns the total number of proposals ever created.

**Returns:** `number` — monotonically increasing proposal count.

**Example:**

```ts
import { fetchProposalCount } from './api';

const count = await fetchProposalCount();
console.log(`Total proposals: ${count}`);
```

---

### `fetchProposal`

```ts
export async function fetchProposal(id: number): Promise<Proposal>
```

Fetches a single proposal by its numeric ID.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `number` | Proposal ID (0-indexed, must be < `fetchProposalCount()`) |

**Returns:** `Proposal`

```ts
interface Proposal {
  id: bigint;
  proposer: string;       // Stellar address
  title: string;
  description: string;
  votes_yes: bigint;
  votes_no: bigint;
  votes_abstain: bigint;
  quorum: bigint;         // Minimum total votes required to pass
  start_time: bigint;     // Unix timestamp (seconds)
  end_time: bigint;       // Unix timestamp (seconds)
  state: ProposalState;   // 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled'
}
```

**Example:**

```ts
import { fetchProposal } from './api';

const proposal = await fetchProposal(0);
console.log(proposal.title);       // "Fund community grants"
console.log(proposal.state);       // "Active"
console.log(proposal.votes_yes);   // 5000000n
```

**Throws** if the proposal ID does not exist (simulation returns no result).

---

### `fetchAllProposals`

```ts
export async function fetchAllProposals(): Promise<Proposal[]>
```

Fetches every proposal by calling `fetchProposalCount` then `fetchProposal` for each ID in parallel.

**Returns:** `Proposal[]` — ordered by proposal ID ascending (0, 1, 2, …).

**Example:**

```ts
import { fetchAllProposals } from './api';

const proposals = await fetchAllProposals();
const active = proposals.filter(p => p.state === 'Active');
```

> For large governance systems with many proposals, consider paginating manually with `fetchProposal` to avoid excessive parallel RPC calls.

---

### `fetchHasVoted`

```ts
export async function fetchHasVoted(proposalId: number, voter: string): Promise<boolean>
```

Checks whether a given address has already voted on a proposal.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `proposalId` | `number` | Proposal ID |
| `voter` | `string` | Stellar address of the voter |

**Returns:** `boolean`

**Example:**

```ts
import { fetchHasVoted } from './api';

const voted = await fetchHasVoted(0, 'GAAZI4TCR3TY5OJHCTJC2A4QSY6...');
if (voted) {
  console.log('Already voted on this proposal');
}
```

---

### `fetchVoteRecord`

```ts
export async function fetchVoteRecord(
  proposalId: number,
  voter: string
): Promise<VoteRecord | null>
```

Returns the vote record for a given voter on a proposal, or `null` if the voter has not voted.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `proposalId` | `number` | Proposal ID |
| `voter` | `string` | Stellar address of the voter |

**Returns:** `VoteRecord | null`

```ts
interface VoteRecord {
  vote: VoteType;   // 'Yes' | 'No' | 'Abstain'
  weight: bigint;   // Token balance at time of vote
}
```

**Example:**

```ts
import { fetchVoteRecord } from './api';

const record = await fetchVoteRecord(0, 'GAAZI4TCR3TY5OJHCTJC2A4QSY6...');
if (record) {
  console.log(record.vote);    // "Yes"
  console.log(record.weight);  // 1000000n
}
```

---

## Token Contract Helpers

### `fetchTokenBalance`

```ts
export async function fetchTokenBalance(address: string): Promise<bigint>
```

Returns the governance token balance for a given Stellar address.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `address` | `string` | Stellar address to query |

**Returns:** `bigint` — raw token units (divide by `10 ** decimals` for display).

**Example:**

```ts
import { fetchTokenBalance, fetchTokenDecimals } from './api';

const [balance, decimals] = await Promise.all([
  fetchTokenBalance('GAAZI4TCR3TY5OJHCTJC2A4QSY6...'),
  fetchTokenDecimals(),
]);
const display = Number(balance) / 10 ** decimals;
console.log(`Balance: ${display} VOTE`);
```

---

### `fetchTokenDecimals`

```ts
export async function fetchTokenDecimals(): Promise<number>
```

Returns the number of decimal places for the governance token (typically `7` for Stellar tokens).

**Returns:** `number`

**Example:**

```ts
import { fetchTokenDecimals } from './api';

const decimals = await fetchTokenDecimals(); // 7
```

---

## Error Handling

All helpers throw a plain `Error` if the simulation fails. Wrap calls in `try/catch`:

```ts
try {
  const proposal = await fetchProposal(99);
} catch (err) {
  console.error('Failed to fetch proposal:', err);
}
```

Common failure reasons:
- Invalid or non-existent proposal ID
- RPC endpoint unreachable
- Contract IDs not set in environment variables (caught by `validateConfig()` on startup)

---

## Types Reference

Full types are defined in `frontend/src/types.ts`:

```ts
export type ProposalState = 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled';
export type VoteType = 'Yes' | 'No' | 'Abstain';

export interface Proposal { ... }   // see fetchProposal above
export interface VoteRecord { ... } // see fetchVoteRecord above
export interface NetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  governanceContractId: string;
  tokenContractId: string;
}
```

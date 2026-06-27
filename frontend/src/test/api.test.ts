import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSimulateTransaction = vi.hoisted(() => vi.fn());

vi.mock('@stellar/stellar-sdk', () => ({
  SorobanRpc: {
    Server: vi.fn().mockImplementation(() => ({ simulateTransaction: mockSimulateTransaction })),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({}),
  })),
  Account: vi.fn(),
  Operation: { invokeContractFunction: vi.fn().mockReturnValue({}) },
  xdr: {},
  scValToNative: vi.fn(),
  nativeToScVal: vi.fn().mockReturnValue({}),
}));

vi.mock('../config', () => ({
  config: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    governanceContractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
    tokenContractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC5',
  },
  ACTIVE_NETWORK: 'testnet',
  validateConfig: vi.fn(),
}));

import { scValToNative } from '@stellar/stellar-sdk';
import { fetchProposalCount, fetchTokenDecimals, fetchTokenBalance } from '../api';

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchProposalCount returns number', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(5);
    expect(await fetchProposalCount()).toBe(5);
  });

  it('fetchTokenDecimals returns number', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(7);
    expect(await fetchTokenDecimals()).toBe(7);
  });

  it('fetchTokenBalance returns bigint', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('1000000');
    expect(await fetchTokenBalance('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN')).toBe(1000000n);
  });

  it('fetchProposalCount throws on simulation failure', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: null });
    await expect(fetchProposalCount()).rejects.toThrow('Simulation failed');
  });
});

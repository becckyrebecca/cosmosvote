import { useState } from 'react';
import type { SimulationPreview } from '../api';
import { simulateCastVote, SimulationError } from '../api';

interface Props {
  proposalId: number;
  walletAddress: string;
}

const VOTE_OPTIONS = ['Yes', 'No', 'Abstain'] as const;
type VoteOption = typeof VOTE_OPTIONS[number];

/** Formats stroops as XLM with 7 decimal places. */
function stroopsToXlm(stroops: string): string {
  const n = Number(stroops);
  return isNaN(n) ? stroops : `${(n / 10_000_000).toFixed(7)} XLM`;
}

/**
 * VoteSimulationPreview
 *
 * Shows the user an estimated transaction fee before they submit a real vote.
 * Simulation errors (e.g. already voted, proposal inactive) are displayed
 * distinctly from network/connection errors.
 */
export function VoteSimulationPreview({ proposalId, walletAddress }: Props) {
  const [selectedVote, setSelectedVote] = useState<VoteOption>('Yes');
  const [preview, setPreview] = useState<SimulationPreview | null>(null);
  const [simError, setSimError] = useState<{ isContract: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSimulate() {
    setLoading(true);
    setPreview(null);
    setSimError(null);
    try {
      const result = await simulateCastVote(walletAddress, proposalId, selectedVote);
      setPreview(result);
    } catch (err) {
      if (err instanceof SimulationError) {
        // Contract-level rejection (already voted, proposal not active, etc.)
        setSimError({ isContract: true, message: err.message });
      } else {
        // Network / RPC error
        setSimError({ isContract: false, message: String(err) });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
      }}
      aria-label="Vote simulation preview"
    >
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#475569' }}>
        Preview transaction before voting
      </h4>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {VOTE_OPTIONS.map(v => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input
              type="radio"
              name={`sim-vote-${proposalId}`}
              value={v}
              checked={selectedVote === v}
              onChange={() => setSelectedVote(v)}
            />
            {v}
          </label>
        ))}
        <button
          onClick={handleSimulate}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.35rem 0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            opacity: loading ? 0.7 : 1,
          }}
          aria-busy={loading}
        >
          {loading ? 'Simulating…' : 'Simulate'}
        </button>
      </div>

      {/* Success preview */}
      {preview && (
        <div
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.75rem', fontSize: '0.875rem' }}
          role="status"
          aria-live="polite"
        >
          <strong style={{ color: '#15803d' }}>✓ Simulation successful</strong>
          <div style={{ marginTop: '0.5rem', color: '#166534' }}>
            Estimated fee: <strong>{stroopsToXlm(preview.feeStoops)}</strong>
          </div>
          <div style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.75rem' }}>
            This is a dry-run — no transaction has been submitted.
          </div>
        </div>
      )}

      {/* Error: contract rejection (distinct styling) */}
      {simError?.isContract && (
        <div
          style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '0.75rem', fontSize: '0.875rem' }}
          role="alert"
          aria-live="assertive"
        >
          <strong style={{ color: '#854d0e' }}>⚠ Contract simulation rejected</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#713f12', fontSize: '0.8rem' }}>{simError.message}</p>
          <p style={{ margin: '0.25rem 0 0', color: '#92400e', fontSize: '0.75rem' }}>
            This would fail on-chain. Check if you have already voted or if the proposal is still active.
          </p>
        </div>
      )}

      {/* Error: network / RPC issue */}
      {simError && !simError.isContract && (
        <div
          style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.75rem', fontSize: '0.875rem' }}
          role="alert"
          aria-live="assertive"
        >
          <strong style={{ color: '#dc2626' }}>✗ Simulation failed</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#991b1b', fontSize: '0.8rem' }}>{simError.message}</p>
        </div>
      )}
    </div>
  );
}

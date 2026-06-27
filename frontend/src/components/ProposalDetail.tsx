import type { Proposal } from '../types';
import type { ToastType } from './Toast';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useRef, useState } from 'react';
import { formatTokenAmount, maskAddress } from '../utils';
import { explorerAccountUrl } from '../config';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  adminAddress?: string | null;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

type PendingAction = 'finalize' | 'execute' | 'cancel' | null;

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose, triggerRef }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!walletAddress) return;
    onAnnounce?.('Checking vote status…');
    Promise.all([
      fetchHasVoted(Number(p.id), walletAddress),
      fetchVoteRecord(Number(p.id), walletAddress),
    ]).then(([voted, record]) => {
      setHasVoted(voted);
      setVoteRecord(record);
      onAnnounce?.(voted && record
        ? `You previously voted ${record.vote} on this proposal.`
        : 'You have not voted on this proposal.');
    });
  }, [p.id, walletAddress]);

  // Focus the close button on open
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Return focus to trigger on unmount
  useEffect(() => {
    return () => {
      triggerRef?.current?.focus();
    };
  }, [triggerRef]);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusable));
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const total = p.votes_yes + p.votes_no + p.votes_abstain;
  const shortAddress = maskAddress(p.proposer);
  const [showFullProposer, setShowFullProposer] = useState(false);

  const showFinalize = walletAddress && p.state === 'Active' && expired;
  const showExecute = isAdmin && p.state === 'Passed';
  const showCancel = isAdmin && (p.state === 'Active' || p.state === 'Passed');

  // Simulated vote submission — real implementation would call castVote via SDK
  async function handleVote(voteType: string) {
    if (!walletAddress || !onToast) return;
    const pendingId = onToast('pending', `Submitting ${voteType} vote — confirm in wallet…`);
    try {
      // Placeholder: actual SDK call would go here
      await new Promise(res => setTimeout(res, 1000));
      onToast('success', `Vote "${voteType}" submitted on proposal #${String(p.id)}.`);
    } catch (e) {
      onToast('error', `Vote failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      // dismiss pending (the success/error toast replaced it)
      void pendingId;
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-dialog-title"
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 id="proposal-dialog-title" style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
          >×</button>
        </div>

          <h3 style={{ margin: '0 0 0.5rem' }}>{p.title}</h3>
          <p style={{ color: '#555' }}>{p.description}</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <tbody>
              {[
                ['State', p.state],
                ['Proposer', (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <a
                      href={explorerAccountUrl(p.proposer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.proposer}
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                    >
                      {showFullProposer ? p.proposer : shortAddress}
                    </a>
                    <button
                      onClick={() => setShowFullProposer(s => !s)}
                      aria-label={showFullProposer ? 'Hide full proposer address' : 'Reveal full proposer address'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.75rem', padding: 0 }}
                    >
                      {showFullProposer ? '🙈' : '👁'}
                    </button>
                  </span>
                )],
                ['Start', formatDate(p.start_time)],
                ['End', formatDate(p.end_time)],
                ['Quorum', formatTokenAmount(p.quorum, decimals)],
                ['Total Votes', formatTokenAmount(total, decimals)],
              ].map(([k, v]) => (
                <tr key={String(k)} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.4rem 0', color: '#888', width: '40%' }}>{k}</td>
                  <td style={{ padding: '0.4rem 0', fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

        {walletAddress && (
          <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem' }}>
            {hasVoted === null ? 'Checking vote status...' :
              hasVoted && voteRecord
                ? `You voted ${voteRecord.vote} with weight ${formatTokenAmount(voteRecord.weight, decimals)}`
                : p.state === 'Active'
                  ? (
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>Cast your vote:</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Yes', 'No', 'Abstain'].map(v => (
                          <button
                            key={v}
                            onClick={() => handleVote(v)}
                            style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.8rem' }}
                          >
                            {v === 'Yes' ? '✅' : v === 'No' ? '❌' : '⬜'} {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                  : 'You have not voted on this proposal.'}
          </div>
        )}

        {votingMessage && (
          <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem', color: '#166534' }}>
            {votingMessage}
          </div>
        )}

        {votingError && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem', color: '#991b1b' }}>
            {votingError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Vote Yes', vote: 'Yes' as const, color: '#16a34a', disabled: !canVote },
            { label: 'Vote No', vote: 'No' as const, color: '#dc2626', disabled: !canVote },
            { label: 'Abstain', vote: 'Abstain' as const, color: '#6b7280', disabled: !canVote },
          ].map(({ label, vote, color, disabled }) => (
            <button
              key={vote}
              onClick={() => handleVote(vote)}
              disabled={disabled || isVoting}
              style={{
                padding: '0.75rem',
                background: disabled || isVoting ? '#e5e7eb' : color,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: disabled || isVoting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                opacity: disabled || isVoting ? 0.6 : 1,
              }}
            >
              {isVoting ? 'Submitting...' : label}
            </button>
          ))}
        </div>

        {!walletAddress && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: 8, fontSize: '0.875rem', color: '#92400e' }}>
            ℹ️ Connect your wallet to vote on this proposal
          </div>
        )}

        {walletAddress && hasVoted && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0e7ff', borderRadius: 8, fontSize: '0.875rem', color: '#3730a3' }}>
            ✓ You have already voted on this proposal
          </div>
        )}

        {walletAddress && !isProposalActive && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3e8ff', borderRadius: 8, fontSize: '0.875rem', color: '#6b21a8' }}>
            ℹ️ This proposal is not active and cannot receive new votes
          </div>
        )}

        {walletAddress && isProposalActive && !votingOpen && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3e8ff', borderRadius: 8, fontSize: '0.875rem', color: '#6b21a8' }}>
            ℹ️ Voting is not open yet or has ended for this proposal
          </div>
        )}
      </div>

      {pendingAction && (
        <ConfirmModal
          title={ACTION_CONFIG[pendingAction].confirmTitle}
          message={ACTION_CONFIG[pendingAction].confirmMsg}
          confirmLabel={ACTION_CONFIG[pendingAction].confirmLabel}
          confirmColor={ACTION_CONFIG[pendingAction].confirmColor}
          onConfirm={() => handleAction(pendingAction)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </>
  );
}

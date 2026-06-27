import { useState } from 'react';
import { useWallet } from '../WalletContext';

export function ConnectWalletModal() {
  const { connect, closeModal } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleConnect = async (wallet: 'Freighter' | 'xBull') => {
    setError(null);
    setLoading(wallet);
    try {
      await connect(wallet);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={closeModal}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', minWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="wallet-modal-title" style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1e293b' }}>Connect Wallet</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(['Freighter', 'xBull'] as const).map(wallet => (
            <button
              key={wallet}
              onClick={() => handleConnect(wallet)}
              disabled={!!loading}
              aria-busy={loading === wallet}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8,
                background: loading === wallet ? '#f1f5f9' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: 500,
              }}
            >
              {loading === wallet ? '⏳' : '🔗'} {wallet}
            </button>
          ))}
        </div>

        {error && <p role="alert" style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}

        <button
          onClick={closeModal}
          aria-label="Close wallet modal"
          style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

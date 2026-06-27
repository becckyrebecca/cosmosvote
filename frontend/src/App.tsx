import { useState, useEffect, useMemo, useRef } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenBalance, fetchTokenDecimals, checkRpcReachability } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalSkeleton } from './components/ProposalSkeleton';
import { ProposalDetail } from './components/ProposalDetail';
import { useToast } from './components/ToastContext';
import { ACTIVE_NETWORK } from './config';
import { formatTokenAmount, maskAddress } from './utils';
import './responsive.css';

const ALL_STATES: ProposalState[] = ['Active', 'Passed', 'Rejected', 'Executed', 'Cancelled'];
const PAGE_SIZE = 20;

async function connect() {
  // wallet connection placeholder
}

// Admin address — in production this would come from the contract or environment config
const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS ?? null;

export default function App() {
  const { walletAddress, walletName, tokenBalance, showModal, openModal, disconnect } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ProposalState | 'All'>('All');
  const [selected, setSelected] = useState<Proposal | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(0);
  const [rpcWarning, setRpcWarning] = useState<string | null>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);

  const connect = () => {
    const addr = prompt('Enter your Stellar address (G...):');
    if (addr?.startsWith('G')) setWalletAddress(addr);
  };

  const disconnect = () => setWalletAddress(null);

  useMeta(
    selected ? selected.title : 'Proposals',
    selected
      ? `${selected.title} — ${selected.description.slice(0, 120)}`
      : 'Browse and vote on on-chain governance proposals for CosmosVote on Stellar Soroban.'
  );

  useEffect(() => {
    if (!walletAddress) { setTokenBalance(null); return; }
    fetchTokenBalance(walletAddress).then(setTokenBalance).catch(() => setTokenBalance(null));
  }, [walletAddress]);

  const refreshProposals = () => {
    fetchAllProposals().then(setProposals).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      fetchAllProposals((loaded, total) => setProgress({ loaded, total })),
      fetchTokenDecimals(),
    ])
      .then(([props, decs]) => {
        setProposals(props);
        setDecimals(decs);
        setAnnouncement(`${props.length} proposal${props.length !== 1 ? 's' : ''} loaded.`);
      })
      .catch(e => {
        setError(String(e));
        setAnnouncement('');
      })
      .catch(e => setError(String(e)))
      .finally(() => { setLoading(false); setProgress(null); });
  }, []);

  useEffect(() => {
    checkRpcReachability().catch(error => {
      setRpcWarning(String(error));
    });
  }, []);

  const connect = () => {
    const addr = prompt('Enter your Stellar address (G...):');
    if (addr?.startsWith('G')) {
      setWalletAddress(addr);
      fetchTokenBalance(addr)
        .then(setTokenBalance)
        .catch(() => setTokenBalance(null));
    }
  };

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      const matchState = stateFilter === 'All' || p.state === stateFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchState && matchSearch;
    });
  }, [proposals, search, stateFilter]);

  const handleProposalCreated = (id: number) => {
    setShowNewForm(false);
    // In a real implementation, fetch the new proposal and navigate to it
    setAnnouncement(`Proposal #${id} created. Refreshing list…`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <AriaLive polite={announcement} assertive={error ?? undefined} />

      {/* Header */}
      <header style={{ background: 'var(--bg-header)', color: 'var(--text-header)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🌌 CosmosVote</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-header-sub)' }}>On-chain governance · {ACTIVE_NETWORK}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ background: 'none', border: '1px solid var(--text-header-sub)', borderRadius: 6, padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-header)', fontSize: '1rem', lineHeight: 1 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {walletAddress ? (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{ fontSize: '0.75rem', color: 'var(--text-header-sub)', cursor: 'pointer', userSelect: 'none' }}
                title={showFullAddress ? 'Click to hide address' : walletAddress}
                onClick={() => setShowFullAddress(s => !s)}
                aria-label={showFullAddress ? 'Click to hide full address' : 'Click to reveal full address'}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setShowFullAddress(s => !s)}
              >
                {showFullAddress ? walletAddress : maskAddress(walletAddress)}
              </div>
              {tokenBalance !== null && (
                <div className={styles.headerBalance}>{formatTokenAmount(tokenBalance, decimals)}</div>
              )}
              <button
                onClick={disconnect}
                style={{ marginTop: '0.25rem', background: 'none', color: '#94a3b8', border: '1px solid #475569', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={openModal}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <ErrorBoundary>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search proposals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: '0.875rem', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            aria-label="Search proposals"
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value as ProposalState | 'All')}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--input-border)', borderRadius: 6, fontSize: '0.875rem', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            aria-label="Filter by state"
          >
            <option value="All">All States</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {rpcWarning && (
          <div style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <strong>RPC warning:</strong> {rpcWarning}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: proposals.length, color: 'var(--text-primary)' },
            { label: 'Active', count: proposals.filter(p => p.state === 'Active').length, color: '#2563eb' },
            { label: 'Passed', count: proposals.filter(p => p.state === 'Passed').length, color: '#16a34a' },
            { label: 'Executed', count: proposals.filter(p => p.state === 'Executed').length, color: '#7c3aed' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ background: 'var(--bg-stat)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {error && <p style={{ textAlign: 'center', color: '#dc2626', marginBottom: '1rem' }}>Error: {error}</p>}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading && (
            <>
              {progress && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  Loading proposals… {progress.loaded}/{progress.total}
                </p>
              )}
              <ProposalSkeleton />
              <ProposalSkeleton />
              <ProposalSkeleton />
            </>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No proposals found.</p>
          )}
          {!loading && filtered.map(p => (
            <ProposalCard key={String(p.id)} proposal={p} decimals={decimals} onClick={(e) => {
              triggerRef.current = e?.currentTarget as HTMLElement ?? null;
              setSelected(p);
            }} />
          ))}
        </div>

        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={filtered.length}
            pageSize={PAGE_SIZE}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          />
        )}
      </main>
      </ErrorBoundary>

      {selected && (
        <ProposalDetail
          proposal={selected}
          decimals={decimals}
          walletAddress={walletAddress}
          adminAddress={ADMIN_ADDRESS}
          onClose={() => setSelected(null)}
          triggerRef={triggerRef}
        />
      )}

      {showModal && <ConnectWalletModal />}
    </div>
  );
}

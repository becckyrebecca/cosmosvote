interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, totalCount, pageSize, onPrev, onNext }: Props) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.875rem', color: '#888' }}>
        {totalCount === 0 ? '0 proposals' : `${start}–${end} of ${totalCount} proposals`}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Previous page"
          style={{
            padding: '0.4rem 0.9rem',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: page <= 1 ? '#f3f4f6' : '#fff',
            color: page <= 1 ? '#9ca3af' : '#1e293b',
            cursor: page <= 1 ? 'default' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ← Prev
        </button>
        <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', color: '#555' }}>
          {page} / {totalPages || 1}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Next page"
          style={{
            padding: '0.4rem 0.9rem',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: page >= totalPages ? '#f3f4f6' : '#fff',
            color: page >= totalPages ? '#9ca3af' : '#1e293b',
            cursor: page >= totalPages ? 'default' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

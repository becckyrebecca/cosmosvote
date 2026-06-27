import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: (proposalId: number) => void;
  onAnnounce?: (msg: string) => void;
  onError?: (msg: string) => void;
}

interface FormState {
  title: string;
  description: string;
  quorum: string;
  duration: string;
}

const INITIAL: FormState = { title: '', description: '', quorum: '', duration: '' };

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};

const dialog: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '2rem',
  maxWidth: 560, width: '90%', maxHeight: '90vh', overflowY: 'auto',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: '0.875rem', width: '100%', boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.75rem' };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const errs: Partial<Record<keyof FormState, string>> = {};
  if (!f.title.trim()) errs.title = 'Title is required.';
  else if (f.title.length > 128) errs.title = 'Title must be ≤ 128 characters.';
  if (!f.description.trim()) errs.description = 'Description is required.';
  else if (f.description.length > 1024) errs.description = 'Description must be ≤ 1024 characters.';
  const q = Number(f.quorum);
  if (!f.quorum || isNaN(q) || q <= 0) errs.quorum = 'Quorum must be a positive number.';
  const d = Number(f.duration);
  if (!f.duration || isNaN(d) || d < 60 || d > 2592000) errs.duration = 'Duration must be 60–2,592,000 seconds.';
  return errs;
}

export function NewProposalForm({ onClose, onSuccess, onAnnounce, onError }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    onAnnounce?.('Submitting proposal…');
    try {
      // Placeholder: replace with real signed transaction when wallet integration is complete
      await new Promise(r => setTimeout(r, 800));
      const mockId = Date.now() % 10000;
      onAnnounce?.(`Proposal submitted successfully. Redirecting to proposal #${mockId}.`);
      onSuccess(mockId);
    } catch (err) {
      const msg = String(err);
      onError?.(msg);
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={dialog}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-proposal-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 id="new-proposal-title" style={{ margin: 0 }}>New Proposal</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldStyle}>
            <label htmlFor="np-title">Title <span aria-hidden="true">*</span></label>
            <input
              id="np-title"
              type="text"
              value={form.title}
              onChange={set('title')}
              maxLength={128}
              style={inputStyle}
              aria-describedby={errors.title ? 'np-title-err' : undefined}
              aria-invalid={!!errors.title}
            />
            <span style={{ fontSize: '0.7rem', color: '#888' }}>{form.title.length}/128</span>
            {errors.title && <span id="np-title-err" style={errorStyle} role="alert">{errors.title}</span>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="np-desc">Description <span aria-hidden="true">*</span></label>
            <textarea
              id="np-desc"
              value={form.description}
              onChange={set('description')}
              maxLength={1024}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              aria-describedby={errors.description ? 'np-desc-err' : undefined}
              aria-invalid={!!errors.description}
            />
            <span style={{ fontSize: '0.7rem', color: '#888' }}>{form.description.length}/1024</span>
            {errors.description && <span id="np-desc-err" style={errorStyle} role="alert">{errors.description}</span>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="np-quorum">Quorum (token units) <span aria-hidden="true">*</span></label>
            <input
              id="np-quorum"
              type="number"
              min={1}
              value={form.quorum}
              onChange={set('quorum')}
              style={inputStyle}
              aria-describedby={errors.quorum ? 'np-quorum-err' : undefined}
              aria-invalid={!!errors.quorum}
            />
            {errors.quorum && <span id="np-quorum-err" style={errorStyle} role="alert">{errors.quorum}</span>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="np-duration">Duration (seconds, 60–2,592,000) <span aria-hidden="true">*</span></label>
            <input
              id="np-duration"
              type="number"
              min={60}
              max={2592000}
              value={form.duration}
              onChange={set('duration')}
              style={inputStyle}
              aria-describedby={errors.duration ? 'np-duration-err' : undefined}
              aria-invalid={!!errors.duration}
            />
            {errors.duration && <span id="np-duration-err" style={errorStyle} role="alert">{errors.duration}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 6, background: '#3b82f6', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

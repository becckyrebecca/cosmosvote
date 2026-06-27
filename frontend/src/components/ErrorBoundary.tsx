import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          padding: '2rem', textAlign: 'center', color: '#991b1b',
          background: '#fee2e2', borderRadius: 8, margin: '2rem auto', maxWidth: 500,
        }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.retry}
            style={{
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 6, padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

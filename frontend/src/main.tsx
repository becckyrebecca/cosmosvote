import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { validateConfig } from './config';
import { ToastProvider } from './components/ToastContext';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

try {
  validateConfig();
  createRoot(root).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>
  );
} catch (error) {
  root.innerHTML = `
    <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-bottom: 1px solid #f87171; text-align: center; font-family: system-ui, sans-serif;">
      <h3 style="margin: 0 0 0.5rem 0;">⚠️ Invalid Configuration</h3>
      <p style="margin: 0;">${(error as Error).message.replace(/\n/g, '<br/>')}</p>
    </div>
  `;
}

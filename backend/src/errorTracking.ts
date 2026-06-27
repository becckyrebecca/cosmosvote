/**
 * Error tracking integration using Sentry.
 *
 * Alert trigger conditions:
 *   - Unhandled promise rejections   → captured automatically via init()
 *   - Unhandled exceptions           → captured automatically via init()
 *   - Webhook delivery failures      → call captureError() with context
 *   - Event polling failures ≥ 3     → call captureError() with retry count
 *   - Any manually caught error      → call captureError() with breadcrumbs
 *
 * Set SENTRY_DSN in the environment to enable. If unset, errors are only
 * logged to stderr (safe for local development).
 */

import * as Sentry from '@sentry/node';

export function initErrorTracking(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[error-tracking] SENTRY_DSN not set — Sentry disabled, logging to stderr only');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: 0.1,
  });

  console.info('[error-tracking] Sentry initialised');
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }

  // Always log locally so operators see it even without Sentry configured.
  console.error('[error-tracking]', err.message, context ?? '');
}

export async function flushErrorTracking(timeoutMs = 2000): Promise<void> {
  await Sentry.close(timeoutMs);
}

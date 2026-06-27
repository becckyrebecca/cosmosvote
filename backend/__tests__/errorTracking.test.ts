/**
 * Tests for the error tracking module.
 * Mocks @sentry/node to avoid real network calls.
 */

import * as Sentry from '@sentry/node';
import { captureError, initErrorTracking } from '../src/errorTracking';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) =>
    cb({ setExtras: jest.fn() })
  ),
  close: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.SENTRY_DSN;
});
afterEach(() => jest.restoreAllMocks());

describe('initErrorTracking', () => {
  it('skips Sentry init when SENTRY_DSN is not set', () => {
    initErrorTracking();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('calls Sentry.init when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://key@sentry.io/123';
    initErrorTracking();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@sentry.io/123' })
    );
  });
});

describe('captureError', () => {
  it('calls Sentry.captureException with an Error', () => {
    const err = new Error('test error');
    captureError(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it('wraps non-Error values in an Error', () => {
    captureError('string error');
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error)
    );
  });

  it('uses withScope when context is provided', () => {
    captureError(new Error('ctx error'), { foo: 'bar' });
    expect(Sentry.withScope).toHaveBeenCalled();
  });
});

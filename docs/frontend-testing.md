# Frontend Testing Guide

This guide explains how to set up, run, and extend the frontend test suite for CosmosVote.

---

## Overview

The frontend uses [Vitest](https://vitest.dev/) as the test runner and [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) for component testing. Vitest is Vite-native — it re-uses the same `vite.config.ts` configuration so tests run with zero extra build setup.

---

## Setup

Vitest and React Testing Library are dev dependencies. Install them once:

```bash
cd frontend
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

Add the following scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Extend `frontend/vite.config.ts` to configure the test environment:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

---

## Running Tests

```bash
# Run all tests once (used in CI)
cd frontend && npm test

# Watch mode — re-runs on file save
cd frontend && npm run test:watch

# Generate a coverage report
cd frontend && npm run test:coverage
```

Coverage output is written to `frontend/coverage/`. Open `coverage/index.html` in a browser to browse it.

---

## File Conventions

| What | Where |
|------|-------|
| Component tests | `frontend/src/components/__tests__/<ComponentName>.test.tsx` |
| Hook / utility tests | `frontend/src/__tests__/<name>.test.ts` |
| API mock helpers | `frontend/src/test/mocks/api.ts` |
| Global test setup | `frontend/src/test/setup.ts` |

Test files must match the glob `**/*.test.{ts,tsx}` — Vitest picks them up automatically.

---

## Writing Component Tests

### Example: `ProposalCard`

```tsx
// frontend/src/components/__tests__/ProposalCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProposalCard } from '../ProposalCard';
import type { Proposal } from '../../types';

const mockProposal: Proposal = {
  id: 0n,
  proposer: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  title: 'Fund community grants',
  description: 'Allocate 10% of treasury to community grants.',
  votes_yes: 5000000n,
  votes_no: 2000000n,
  votes_abstain: 500000n,
  quorum: 3000000n,
  start_time: 1700000000n,
  end_time: 1700086400n,
  state: 'Active',
};

test('renders proposal title and state', () => {
  render(<ProposalCard proposal={mockProposal} />);
  expect(screen.getByText('Fund community grants')).toBeInTheDocument();
  expect(screen.getByText('Active')).toBeInTheDocument();
});
```

### Mocking API Calls

The API helpers in `frontend/src/api.ts` make real RPC calls — mock them in tests using Vitest's `vi.mock`:

```ts
// frontend/src/test/mocks/api.ts
import { vi } from 'vitest';

export const mockFetchAllProposals = vi.fn();
export const mockFetchHasVoted = vi.fn();

vi.mock('../../api', () => ({
  fetchAllProposals: mockFetchAllProposals,
  fetchHasVoted: mockFetchHasVoted,
}));
```

Then in your test file:

```tsx
import { mockFetchAllProposals } from '../test/mocks/api';

beforeEach(() => {
  mockFetchAllProposals.mockResolvedValue([mockProposal]);
});

test('renders a list of proposals', async () => {
  render(<ProposalList />);
  expect(await screen.findByText('Fund community grants')).toBeInTheDocument();
});
```

### Testing Async State

Use `findBy*` queries (which wait for the element to appear) for components that fetch data on mount:

```tsx
// findByText retries until the text appears or the timeout is reached
const title = await screen.findByText('Fund community grants');
expect(title).toBeInTheDocument();
```

---

## Adding New Tests

1. Create a file matching `<ComponentName>.test.tsx` next to the component or in `__tests__/`.
2. Import `render` and query helpers from `@testing-library/react`.
3. Mock all API calls using `vi.mock` — tests must not make real network requests.
4. Cover at minimum: renders without error, key UI elements are present, and one user interaction.
5. Run `npm test` locally to confirm the test passes before opening a PR.

---

## CI Expectations

The CI pipeline (`.github/workflows/ci.yml`) currently runs Rust contract tests. Frontend tests are not yet wired into CI but should be added as a separate job:

```yaml
frontend-test:
  name: Frontend Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    - run: npm ci
      working-directory: frontend
    - run: npm test
      working-directory: frontend
    - run: npm run test:coverage
      working-directory: frontend
    - uses: actions/upload-artifact@v4
      with:
        name: frontend-coverage
        path: frontend/coverage/
```

**Coverage expectations:**

- New components must include at least one test file before merging.
- PRs that remove tests or lower coverage without justification will be blocked.
- There is no hard coverage percentage gate yet — aim for covering all meaningful user interactions and error states.

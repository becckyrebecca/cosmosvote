# Frontend Dependency Audit

Audit performed to identify and remove unused frontend dependencies per issue #278.

## Audit Results

### Production Dependencies

| Package | Version | Used | Notes |
|---------|---------|------|-------|
| `@stellar/freighter-api` | ^6.0.1 | ✅ Yes | Used in `src/WalletContext.tsx` for Freighter wallet adapter |
| `@stellar/stellar-sdk` | 12.3.0 | ✅ Yes | Used in `src/api.ts` for Soroban RPC calls and contract invocations |
| `react` | 19.2.7 | ✅ Yes | Core UI framework, used throughout `src/` |
| `react-dom` | 19.2.7 | ✅ Yes | Required by React for DOM rendering in `src/main.tsx` |

**No unused production dependencies found.**

### Dev Dependencies

| Package | Version | Used | Notes |
|---------|---------|------|-------|
| `@testing-library/jest-dom` | 6.4.6 | ✅ Yes | Custom matchers for Vitest tests |
| `@testing-library/react` | 16.3.2 | ✅ Yes | Component testing utilities |
| `@testing-library/user-event` | 14.5.2 | ✅ Yes | Simulates user interactions in tests |
| `@types/react` | 19.2.17 | ✅ Yes | TypeScript types for React |
| `@types/react-dom` | 19.2.3 | ✅ Yes | TypeScript types for ReactDOM |
| `@typescript-eslint/eslint-plugin` | 8.61.0 | ✅ Yes | ESLint rules for TypeScript |
| `@typescript-eslint/parser` | 8.61.0 | ✅ Yes | Parser for TypeScript ESLint |
| `@vitejs/plugin-react` | 6.0.2 | ✅ Yes | Vite React plugin, used in `vite.config.ts` |
| `@vitest/coverage-v8` | 4.1.8 | ✅ Yes | Coverage reporting for Vitest |
| `eslint` | 10.4.1 | ✅ Yes | Linter, used in `lint` npm script |
| `eslint-plugin-react-hooks` | 7.1.1 | ✅ Yes | Enforces React hooks rules |
| `license-checker` | 25.0.1 | ✅ Yes | License compliance, used in `license-check` script |
| `typescript` | 6.0.3 | ✅ Yes | TypeScript compiler |
| `vite` | 5.3.1 | ✅ Yes | Build tool and dev server |
| `vitest` | 4.1.8 | ✅ Yes | Unit test runner |

**No unused dev dependencies found.**

## Bundle Optimizations in Place

- **Minimal production dependency surface**: The app ships four runtime dependencies — React, ReactDOM, Stellar SDK, and Freighter wallet API. No UI component libraries, routing libraries, or state management frameworks are included.
- **Tree-shaking via Vite**: Vite's Rollup-based build performs automatic tree-shaking, ensuring only imported SDK functions are bundled.
- **TypeScript strict mode**: Enables dead-code detection at compile time.

## How to Analyze the Bundle

```bash
cd frontend
npm run build        # build production bundle
npm run preview      # preview the production build locally
npm run bundle-analyze  # build with bundle size output
```

To inspect bundle composition in detail, install `rollup-plugin-visualizer` temporarily:

```bash
npm install --save-dev rollup-plugin-visualizer
# Add to vite.config.ts plugins: visualizer({ open: true })
npm run build
# stats.html opens with a breakdown of bundle contents
npm uninstall rollup-plugin-visualizer
```

## Conclusion

All installed packages are actively used. No packages were removed. The bundle is already minimal for a React + Stellar SDK application.

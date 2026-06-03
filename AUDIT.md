# Audit Report

## Status

| Contract | Version | Auditor | Date | Status |
|----------|---------|---------|------|--------|
| cosmosvote-governance | 1.0.0 | OtterSec | 2026-05-16 | ✅ Complete |
| cosmosvote-token | 1.0.0 | OtterSec | 2026-05-16 | ✅ Complete |

**Full report:** [docs/security/audit-report.md](./docs/security/audit-report.md)

---

## Scope

The audit covers:

- `contracts/governance/src/` — all source files
- `contracts/token/src/` — all source files

Out of scope:
- Frontend code
- Deployment scripts
- Off-chain indexers

See [docs/security/audit-scope.md](./docs/security/audit-scope.md) for the full scope document.

---

## Finding Summary

| Severity | Total | Resolved | Accepted | Open |
|----------|-------|----------|----------|------|
| Critical | 0 | — | — | 0 |
| High | 2 | 2 | 0 | **0** |
| Medium | 3 | 3 | 0 | **0** |
| Low | 4 | 2 | 2 | **0** |
| Informational | 5 | 0 | 5 | **0** |

All Critical and High findings have been resolved. The contracts are cleared for mainnet deployment.

---

## Auditor

**Firm:** OtterSec  
**Engagement period:** 2026-04-14 — 2026-05-09  
**Report date:** 2026-05-16  
**Contact:** security@cosmosvote.dev

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing **security@cosmosvote.dev** with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact assessment
4. Any suggested mitigations

You will receive an acknowledgment within **48 hours** and a full response within **7 days**.

## Disclosure Policy

- We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure)
- We will coordinate a fix and release before public disclosure.
- Credit will be given to reporters in the release notes (unless anonymity is requested)
- We do not pursue legal action against good-faith security researchers

## Security Properties

CosmosVote is designed with the following security guarantees:

| Property | Implementation |
|----------|---------------|
| Vote integrity | Each address votes once per proposal; weight = live balance |
| No double-voting | Persistent `HasVoted` flag checked before every vote |
| Auth enforcement | `require_auth()` on all state-changing operations |
| Arithmetic safety | `checked_add` / `checked_sub` on all token amounts |
| Initialization safety | One-time init guard; admin/token immutable after init |
| Emergency pause | Admin can pause all state-changing operations |

## Known Limitations

See [docs/security/known-issues.md](./docs/security/known-issues.md) for documented limitations and accepted risks.

## Audit Status

See [AUDIT.md](./AUDIT.md) for audit history and scope.

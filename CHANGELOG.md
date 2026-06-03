# Changelog

All notable changes to CosmosVote are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). .
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.0.0] — 2026-05-17

### Added

- `cosmosvote-governance` contract: proposals, voting, finalization, execution, cancellation
- `cosmosvote-token` contract: SEP-41-compatible governance token with mint/burn/transfer/allowances
- Token-weighted voting with live balance snapshots
- Three-way voting: Yes / No / Abstain
- Double-vote prevention via persistent `HasVoted` flag
- Quorum enforcement at finalization
- Admin controls: pause/unpause, update quorum, transfer admin
- Proposal cooldown and minimum balance requirements
- On-chain events for all state transitions
- Tiered storage strategy (instance / persistent / temporary)
- 40+ unit tests for governance contract
- 20+ unit tests for token contract
- Property-based tests with `proptest`
- Docker + Docker Compose development environment
- Deployment scripts for local, testnet, and mainnet
- GitHub Actions CI, CodeQL, and release workflows
- React + Vite frontend proposal browser
- Full documentation: README, ADRs, security docs, examples

[Unreleased]: https://github.com/PrincessnJoy/cosmosvote/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/PrincessnJoy/cosmosvote/releases/tag/v1.0.0

# Admin Action Monitoring

Admin actions within the CosmosVote governance contract bypass standard voting delays to ensure swift resolution during critical events. However, if an admin key is compromised, this capability becomes a severe security risk. To mitigate this risk, CosmosVote provides a monitoring script to watch for and alert on these on-chain events.

## Audit Trail

The governance contract emits the following on-chain events for admin actions:
- `exec`: An admin forcefully executes a proposal.
- `cancel`: An admin cancels a proposal.
- `paused`: The contract has been paused.
- `unpaused`: The contract has been unpaused.
- `admin_trans` (admin transfer operations)
- `quorum`: A quorum update.

## Setup Instructions

A monitoring script is provided at `scripts/admin_monitor.js`. This script queries the Stellar Horizon network for contract events matching the topics above and sends alerts via a Slack Webhook (or any supported notification system you adapt it for).

### Prerequisites
- Node.js (v14 or higher)
- `@stellar/stellar-sdk`

### Configuration

You can configure the monitor using the following environment variables:
- `GOVERNANCE_CONTRACT_ID`: The deployed contract ID.
- `HORIZON_URL`: The Stellar Horizon API (default: `https://horizon-testnet.stellar.org`).
- `SLACK_WEBHOOK_URL`: (Optional) A Slack Incoming Webhook for alerts.

### Running the Monitor

```bash
export GOVERNANCE_CONTRACT_ID="C..."
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

node scripts/admin_monitor.js
```

## Security Considerations

- Consider introducing a time-delay on non-emergency admin actions to allow the community time to respond.
- Alerting mechanisms like PagerDuty can be easily integrated by updating the `sendSlackAlert` function.

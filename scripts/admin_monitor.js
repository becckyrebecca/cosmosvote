/**
 * Admin Action Monitor Script
 * 
 * Watches the Stellar Horizon network for CosmosVote admin events and sends 
 * alerts to a configured Slack webhook or other PagerDuty/Email services.
 * 
 * Usage:
 *   export GOVERNANCE_CONTRACT_ID=C...
 *   export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
 *   node scripts/admin_monitor.js
 */

const { Horizon } = require('@stellar/stellar-sdk');
const https = require('https');

const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const CONTRACT_ID = process.env.GOVERNANCE_CONTRACT_ID;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const POLL_INTERVAL_MS = 15000;

if (!CONTRACT_ID) {
  console.error("GOVERNANCE_CONTRACT_ID is required");
  process.exit(1);
}

const server = new Horizon.Server(HORIZON_URL);

// Admin event topics to watch based on governance events
const ADMIN_EVENTS = ['exec', 'cancel', 'paused', 'unpaused', 'admin_trans', 'quorum'];

function sendSlackAlert(message) {
  if (!SLACK_WEBHOOK_URL) {
    console.log("[ALERT] (No Slack Webhook Configured) ->", message);
    return;
  }

  const payload = JSON.stringify({ text: `🚨 *Admin Action Alert* 🚨\n${message}` });
  const url = new URL(SLACK_WEBHOOK_URL);

  const req = https.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
    }
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to send Slack alert. Status: ${res.statusCode}`);
    }
  });

  req.on('error', (err) => console.error('Slack alert error:', err.message));
  req.write(payload);
  req.end();
}

async function startMonitor() {
  console.log(`Starting Admin Action Monitor on ${HORIZON_URL}...`);
  console.log(`Watching contract: ${CONTRACT_ID}`);
  
  let cursor = 'now';

  setInterval(async () => {
    try {
      const response = await server.contractEvents({
        contractId: CONTRACT_ID,
        cursor: cursor !== 'now' ? cursor : undefined,
        limit: 50,
      });

      for (const record of response.records) {
        cursor = record.id;
        const topics = record.topic;
        
        if (topics && topics.length >= 2) {
          // Attempt to extract values
          let nsVal = topics[0];
          let subtypeVal = topics[1];

          if (record.topic && typeof record.topic[0] === 'object') {
             nsVal = record.topic[0].value || nsVal;
             subtypeVal = record.topic[1].value || subtypeVal;
          }

          if (nsVal === 'gov' && ADMIN_EVENTS.includes(subtypeVal)) {
            sendSlackAlert(`Admin event detected: *${subtypeVal}*\nEvent ID: \`${record.id}\`\nLedger: ${record.ledger_closed_at}`);
          }
        }
      }
    } catch (err) {
      console.error('Error polling events:', err.message);
    }
  }, POLL_INTERVAL_MS);
}

startMonitor();

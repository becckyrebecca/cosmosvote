#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ] && [ -n "${PROPOSAL_IDS:-}" ]; then
  set -- $PROPOSAL_IDS
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <proposal-id> [proposal-id ...]"
  echo "Alternatively set PROPOSAL_IDS to a space-separated list of expired proposal IDs."
  exit 1
fi

if [ -z "${SOROBAN_RPC_URL:-}" ] || [ -z "${GOVERNANCE_CONTRACT_ID:-}" ]; then
  echo "Required environment variables: SOROBAN_RPC_URL, GOVERNANCE_CONTRACT_ID"
  exit 1
fi

for proposal_id in "$@"; do
  echo "Finalizing proposal ${proposal_id}..."
  soroban contract invoke \
    --rpc-url "$SOROBAN_RPC_URL" \
    --id "$GOVERNANCE_CONTRACT_ID" \
    --fn finalise \
    --arg "u64:${proposal_id}"
  echo "Proposal ${proposal_id} finalise call submitted."
  echo
 done

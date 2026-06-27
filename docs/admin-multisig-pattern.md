# Admin Multisig Pattern (Issue #3)

## Overview

The CosmosVote governance contract supports a **two-step admin transfer pattern** to safely delegate admin privileges to multisig accounts. This prevents accidental admin loss and enables secure administrative operations on mainnet deployments.

## Problem

Initially, the contract featured a single-step admin transfer:
```javascript
transfer_admin(admin, new_admin)  // Immediately changes admin
```

This approach is risky in production because:
- A typo in the `new_admin` address permanently loses admin privileges.
- No time for verification before the transfer completes
- Incompatible with multisig contract requirements

## Solution: Two-Step Transfer Pattern

The contract now implements a **two-step transfer pattern**:

1. **Step 1**: Current admin initiates the transfer
   ```javascript
   transfer_admin(current_admin, multisig_address)
   ```
   - Sets `pending_admin` to `multisig_address`
   - Current admin remains unchanged
   - Events emitted for transparency

2. **Step 2**: Pending admin accepts the transfer
   ```javascript
   accept_admin(multisig_address)
   ```
   - Multisig account confirms acceptance
   - Admin role is officially transferred
   - `pending_admin` is cleared

## Benefits

✅ **Safe**: Admin transfer requires two-step verification
✅ **Reversible**: Current admin can initiate a new transfer before acceptance
✅ **Transparent**: On-chain events document all transfers
✅ **Multisig Compatible**: Works seamlessly with Stellar multisig accounts
✅ **Non-Custodial**: New admin controls when transfer completes

## Implementation

### Query Current Admin State

```javascript
const config = await gov.get_config();
console.log("Current Admin:", config.admin);

const pending = await gov.pending_admin();
if (pending) {
  console.log("Pending Admin:", pending);
}
```

### Initiating a Transfer

```javascript
// Current admin (single EOA or existing multisig) initiates transfer
const tx = await gov.transfer_admin({
  admin: currentAdminAddress,
  new_admin: newMultisigAddress
});

// At this point, transfer is initiated but NOT complete
// currentAdminAddress is still the admin
```

### Accepting the Transfer

```javascript
// New multisig account accepts the transfer
const tx = await gov.accept_admin({
  pending_admin: newMultisigAddress
});

// Now newMultisigAddress is the official admin
```

## Recommended Pattern for Production

### Step 1: Deploy with Single EOA

```javascript
// Initial deployment uses a single EOA for simplicity
const adminEOA = Address.generate();
gov.initialize({
  admin: adminEOA,
  voting_token: tokenAddress,
  // ... other parameters
});
```

### Step 2: Transition to Multisig

1. Create a Stellar multisig account with appropriate signers
2. EOA initiates transfer:
   ```javascript
   await gov.transfer_admin({
     admin: adminEOA,
     new_admin: multisigAddress
   });
   ```
3. Multisig signers collectively accept:
   ```javascript
   // Multisig operation: collect signatures from M-of-N signers
   await gov.accept_admin({
     pending_admin: multisigAddress
   });
   ```

### Step 3: Secure Operations

Once multisig is admin, all sensitive operations require multisig approval:
- Pausing/unpausing the contract
- Executing proposals
- Cancelling proposals
- Updating proposal configuration

## Stellar Multisig Example

```javascript
// Create a multisig account with 2-of-3 signers
const multisigAddress = new StrKey.Account('G...');

// Add signers
multisigOp.addSigner(signerA, signerWeightA);
multisigOp.addSigner(signerB, signerWeightB);
multisigOp.addSigner(signerC, signerWeightC);

// Set thresholds
multisigOp.setThreshold(2);  // Require 2 signatures for operations

// Now use multisigAddress as admin in governance
gov.initialize({
  admin: multisigAddress,
  // ...
});
```

## Events

The contract emits on-chain events for all admin transfers:

```javascript
// Event when transfer is initiated
GovernanceEvents::admin_transfer_initiated(current_admin, new_admin)

// Event when transfer is accepted
GovernanceEvents::admin_transfer_completed(old_admin, new_admin)
```

## Error Handling

```javascript
// NoPendingAdmin: No pending admin transfer exists
gov.accept_admin(address)  // Error if no pending transfer

// NotPendingAdmin: Called by wrong address
gov.accept_admin(wrongAddress)  // Error if not the pending admin

// NotAdmin: Caller is not current admin
gov.transfer_admin(nonAdmin, address)  // Error if not current admin
```

## See Also

- [Stellar Multisig Documentation](https://developers.stellar.org/learn/expert/multisig)
- [Soroban Authorization](https://developers.stellar.org/learn/smart-contracts/writing-contracts/authorization)
- [ADR-001: Stellar Soroban Platform](./adr/ADR-001-stellar-soroban-platform.md)

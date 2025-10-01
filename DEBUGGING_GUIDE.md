# Debugging Guide for Solana/Anchor Tests

## Overview

I've added enhanced error logging to all your test helper functions. Now when a transaction fails, you'll see detailed logs automatically!

## What's Changed

### 1. Helper Functions Now Log Errors Automatically

All transaction helper functions (`buyBet`, `sellBet`, `initialize`) now catch errors and log detailed information before re-throwing.

**Example Output:**
```
❌ BuyBet transaction failed!
Transaction logs:
  Program 9iCxo1... invoke [1]
  Program log: Instruction: BuyBet
  Program 9iCxo1... consumed 54360 of 200000 compute units
  Program 9iCxo1... failed: Cross-program invocation with unauthorized signer or writable account
```

### 2. New Error Logger Utility

I've created `tests/utils/error-logger.ts` with advanced debugging functions.

## How to Use

### Method 1: Use Updated Helper Functions (Automatic)

The helper functions now automatically log errors:

```typescript
import { buyBet } from "./utils";

// This will automatically log detailed error info if it fails
await buyBet(
  program,
  user,
  amount,
  configAddress,
  // ... other params
);
```

### Method 2: Use Error Logger in Your Tests

For custom error handling in tests:

```typescript
import { logTransactionError } from "./utils/error-logger";

try {
  await program.methods
    .buyBet(amount)
    .accounts({ /* ... */ })
    .rpc();
} catch (error) {
  logTransactionError(error, "Buy Bet Transaction");
  // The error is logged with full details
  throw error; // Re-throw if you want the test to fail
}
```

### Method 3: Debug Account Info

Log account addresses and info for debugging:

```typescript
import { logAccountInfo, logPdaDerivation } from "./utils/error-logger";

// Log account details
logAccountInfo("Vault Account", vaultAddress, {
  "Is PDA": true,
  "Owner": "Market Program"
});

// Log PDA derivation for debugging
const [authority, bump] = await getAuthAddress(program.programId);
logPdaDerivation(
  "Authority PDA",
  [Buffer.from("vault_and_lp_mint_auth_seed")],
  program.programId,
  authority,
  bump
);
```

## Understanding the Error Output

### Error Log Structure

```
================================================================================
❌ Transaction Name FAILED
================================================================================

📝 Error Message:
<The main error message>

📋 Transaction Logs:
--------------------------------------------------------------------------------
  0: Program <program_id> invoke [1]
  1: 💬 Program log: Instruction: BuyBet
  2: ❌ Program <program_id> failed: Cross-program invocation...
--------------------------------------------------------------------------------

💡 Common Cause:
   - An account needs #[account(mut)] attribute
   - A PDA needs correct signer seeds
   ...
================================================================================
```

### Key Sections

1. **📝 Error Message**: High-level description of what went wrong
2. **📋 Transaction Logs**: Step-by-step execution logs from Solana
3. **💡 Common Cause**: Suggestions for what might be wrong
4. **🔢 Error Code**: Anchor/Solana error codes if available

## Common Errors and What They Mean

### 1. "Cross-program invocation with unauthorized signer or writable account"

**What it means:** An account needs proper permissions for a CPI (Cross-Program Invocation).

**How to debug:**
1. Look for the account name in logs (e.g., "EeDFjYNY...'s writable privilege escalated")
2. Check if that account has `#[account(mut)]` in the Rust struct
3. Verify PDA signer seeds are correct

**Example fix:**
```rust
// Before (wrong):
pub ct1_mint: InterfaceAccount<'info, Mint>,

// After (correct):
#[account(mut)]
pub ct1_mint: InterfaceAccount<'info, Mint>,
```

### 2. "Could not create program address with signer seeds"

**What it means:** The PDA seeds used for signing don't match the actual PDA.

**How to debug:**
1. Check the `auth_bump` value is being saved correctly
2. Verify seeds in signing match seeds in derivation
3. Add logging to compare bump values

**Example debug code:**
```typescript
// In your test
const [authority, expectedBump] = await getAuthAddress(program.programId);
const vaultState = await program.account.vaultState.fetch(vaultStateAddress);
console.log("Expected bump:", expectedBump);
console.log("Stored bump:", vaultState.authBump);
// These should match!
```

### 3. "ConstraintSeeds violation"

**What it means:** The provided account address doesn't match the PDA derivation.

**How to debug:**
```typescript
import { logPdaDerivation } from "./utils/error-logger";

// Log expected vs actual
const [expectedAddress, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_state"), configAddress.toBuffer(), mintAddress.toBuffer()],
  program.programId
);

console.log("Expected:", expectedAddress.toString());
console.log("Provided:", vaultStateAddress.toString());
console.log("Match:", expectedAddress.equals(vaultStateAddress));
```

## Advanced Debugging Techniques

### 1. Add Logging to Contract (msg! macro)

In your Rust contract:

```rust
use anchor_lang::prelude::*;

pub fn buy_bet(ctx: Context<BuyBet>, amount: u64) -> Result<()> {
    let vault_state = ctx.accounts.vault_state.load()?;
    
    // Add debug logs
    msg!("Authority bump: {}", vault_state.auth_bump);
    msg!("Vault address: {}", vault_state.vault);
    msg!("Buy amount: {}", amount);
    
    // Your code...
}
```

Then rebuild and the logs will appear in transaction logs!

### 2. Inspect Account Data

```typescript
// Fetch and inspect vault state
const vaultState = await program.account.vaultState.fetch(vaultStateAddress);
console.log("VaultState data:", {
  marketConfig: vaultState.marketConfig.toString(),
  authBump: vaultState.authBump,
  vault: vaultState.vault.toString(),
  vaultCollateralBalance: vaultState.vaultCollateralBalance.toString(),
  ctf1Mint: vaultState.ctf1Mint.toString(),
  ctf2Mint: vaultState.ctf2Mint.toString(),
  resolution: vaultState.resolution,
});
```

### 3. Use Solana Explorer

When a transaction fails, you can view it on Solana Explorer:

```typescript
try {
  const tx = await program.methods.buyBet(amount).rpc();
  console.log("Success! View tx:", `https://explorer.solana.com/tx/${tx}?cluster=custom`);
} catch (error) {
  if (error.signature) {
    console.log("Failed tx:", `https://explorer.solana.com/tx/${error.signature}?cluster=custom`);
  }
}
```

## Running Tests with Detailed Logs

### See All Logs
```bash
# Run tests with full output
anchor test

# Run specific test file with logs
RUST_LOG=debug anchor test tests/buy-bet.test.ts
```

### Filter for Specific Errors
```bash
# Show only error logs
anchor test 2>&1 | grep -A 10 "❌"

# Show only transaction logs
anchor test 2>&1 | grep -A 20 "Transaction logs:"
```

## Quick Debugging Checklist

When a test fails:

- [ ] Read the error message carefully
- [ ] Check transaction logs for the actual program error
- [ ] Verify all account addresses are correct
- [ ] Check PDA derivations match
- [ ] Verify `#[account(mut)]` is on all accounts that get modified
- [ ] Check bump seeds are stored and used correctly
- [ ] Ensure account sizes (LEN) are large enough
- [ ] Clear test-ledger if structure changed: `rm -rf test-ledger .anchor`

## Example: Full Debug Session

```typescript
import { logTransactionError, logAccountInfo, logPdaDerivation } from "./utils/error-logger";

it("should debug buy bet", async () => {
  // Log initial state
  console.log("\n=== SETUP ===");
  logAccountInfo("Config", configAddress);
  logAccountInfo("Vault State", vaultStateAddress);
  
  // Log PDA derivations
  const [authority, authBump] = await getAuthAddress(program.programId);
  logPdaDerivation("Authority", [Buffer.from("vault_and_lp_mint_auth_seed")], program.programId, authority, authBump);
  
  // Fetch and log account data
  const vaultState = await program.account.vaultState.fetch(vaultStateAddress);
  console.log("Stored auth_bump:", vaultState.authBump);
  console.log("Derived auth_bump:", authBump);
  console.log("Match:", vaultState.authBump === authBump);
  
  // Try transaction
  try {
    await buyBet(/* params */);
    console.log("✅ Success!");
  } catch (error) {
    logTransactionError(error, "Buy Bet");
    throw error;
  }
});
```

## Summary

- ✅ All helper functions now log errors automatically
- ✅ Use `logTransactionError()` for custom error logging
- ✅ Use `logAccountInfo()` and `logPdaDerivation()` for debugging PDAs
- ✅ Add `msg!()` logging to Rust code for detailed traces
- ✅ Always check transaction logs first when debugging

Happy debugging! 🐛🔍

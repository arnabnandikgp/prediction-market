# Quick Reference - Debugging Solana Transactions

## 🚀 Quick Start

### Get Detailed Logs (Automatic)
```bash
anchor test
```
All helper functions now log errors automatically!

### Get Even More Detail
```typescript
import { logTransactionError } from "./utils/error-logger";

try {
  await transaction();
} catch (error) {
  logTransactionError(error, "Transaction Name");
  throw error;
}
```

## 🔍 Common Commands

```bash
# Clean and rebuild everything
rm -rf test-ledger .anchor && anchor clean && anchor build

# Run all tests
anchor test

# Run specific test file
anchor test tests/buy-bet.test.ts

# Run with more logs
RUST_LOG=debug anchor test

# Save test output
anchor test 2>&1 | tee test-output.log

# Show only errors
anchor test 2>&1 | grep -A 20 "❌"
```

## 📋 Error Quick Reference

| Error | Meaning | Fix |
|-------|---------|-----|
| Cross-program invocation with unauthorized... | Account needs mut or CPI permission | Add `#[account(mut)]` |
| Could not create program address... | PDA seeds don't match | Check auth_bump storage |
| ConstraintSeeds violation | Wrong PDA derivation | Verify seeds |
| Writable privilege escalated | CPI permission issue | Check account attributes |

## 🛠️ Debug Functions

```typescript
// Log error with full details
logTransactionError(error, "Transaction Name");

// Log account info
logAccountInfo("Account Name", publicKey, { 
  "Info": "value" 
});

// Log PDA derivation
logPdaDerivation("PDA Name", seeds, programId, address, bump);
```

## 📝 Add Logging to Contract

```rust
use anchor_lang::prelude::*;

pub fn buy_bet(ctx: Context<BuyBet>, amount: u64) -> Result<()> {
    msg!("Debug: auth_bump = {}", vault_state.auth_bump);
    // ... rest of code
}
```

## 🔄 Typical Debug Flow

1. **Run test** → See which one fails
2. **Check error logs** → Identify the error type
3. **Add debug logging** → In contract or test
4. **Rebuild & retest** → `anchor build && anchor test`
5. **Compare values** → Check if PDAs/bumps match
6. **Fix issue** → Update contract or test
7. **Clean & test** → `rm -rf test-ledger && anchor test`

## ✅ Fixes Already Applied

- [x] Fixed MARKET_CONFIG_SEED mismatch
- [x] Added `#[account(mut)]` to mints
- [x] Fixed VaultState::LEN (216 → 290 bytes)
- [x] Removed duplicate vault_state load
- [x] Added error logging to all helpers

## 📚 Documentation Files

- `DEBUGGING_GUIDE.md` - Complete debugging guide
- `FINAL_SUMMARY.md` - Everything that was done
- `ALL_FIXES_APPLIED.md` - List of all fixes
- `QUICK_REFERENCE.md` - This file!

## 💡 Pro Tips

1. Always clean test-ledger after contract changes
2. Use `msg!()` in Rust for debug logging
3. Compare expected vs actual PDA addresses
4. Check auth_bump is stored correctly
5. Verify account sizes (LEN) are correct
6. Look for "writable privilege escalated" in logs - tells you which account

## 🎯 Current Status

**3/11 tests passing** - Init tests work, buy/sell need CPI fix

**Main Issue**: Auth bump or vault PDA permissions

**Next Step**: Add debug logging to contract, rebuild, test

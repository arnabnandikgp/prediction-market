# Testing Notes & Contract Issues

## Overview
This document outlines the issues found in the market_program contract, the fixes applied, and the test implementation approach.

## Contract Fixes Applied ✅

### Your Fixes (Verified Correct):
1. ✅ **Removed hardcoded admin address** - Line 17-18 in `initialize.rs`
2. ✅ **Added auth_bump initialization** - Line 120 in `initialize.rs` 
3. ✅ **Added vault field initialization** - Line 121 in `initialize.rs`
4. ✅ **Fixed signer seeds in buy_bet** - Lines 95 & 103 in `buy_bet.rs`
5. ✅ **Updated VaultState::initialize signature** - Now accepts `auth_bump` and `vault`
6. ✅ **Removed duplicate vault_state load** in `buy_bet.rs` (my fix)

### Test Helper Fixes:
7. ✅ **Fixed MARKET_CONFIG_SEED** - Changed from "amm_config" to "market_config" in `pda.ts`

## Previous Contract Issues (NOW FIXED)

### 1. **Missing `vault` field initialization in VaultState**
- **Location**: `programs/market_program/src/instructions/initialize.rs`
- **Issue**: The `vault_state.vault` field is never set during initialization, remaining as the default PublicKey (all zeros)
- **Impact**: 
  - `buy_bet` and `sell_bet` instructions have constraints checking `vault.key() == vault_state.load()?.vault`
  - These constraints will fail because vault_state.vault is never initialized
  - Current tests show these instructions will fail with constraint errors

**Fix needed**: Add this line in the `initialize` function after creating vault_state:
```rust
vault_state.vault = ctx.accounts.vault.key();
```

### 2. **Missing `auth_bump` field initialization in VaultState**
- **Location**: `programs/market_program/src/instructions/initialize.rs`
- **Issue**: The `auth_bump` field is never set during initialization
- **Impact**: 
  - `sell_bet` and `get_reward` instructions use `vault_state.auth_bump` for PDA signing
  - These operations will fail with incorrect signer seeds

**Fix needed**: Add this line in the `initialize` function:
```rust
vault_state.auth_bump = ctx.bumps.authority;
```

### 3. **Incorrect signer seeds in `buy_bet` instruction**
- **Location**: `programs/market_program/src/instructions/buy_bet.rs`, lines ~95-103
- **Issue**: The `token_mint_to` calls use `&[&[b"bettor", ctx.accounts.vault.key().as_ref()]]` as signer seeds
- **Expected**: Should use AUTH_SEED: `&[&[crate::AUTH_SEED.as_bytes(), &[auth_bump]]]`
- **Impact**: Minting conditional tokens will fail because the authority PDA cannot sign with these seeds

**Fix needed**: Update the signer seeds in both `token_mint_to` calls to match the authority PDA derivation.

### 4. **Hardcoded admin address in initialize instruction**
- **Location**: `programs/market_program/src/instructions/initialize.rs`, line 18
- **Issue**: Creator is constrained to a specific hardcoded address: `pubkey!("Hoamid9gD8dEgLrirgt3gNnAWhmxYe5LSKrJJUGGd4DA")`
- **Impact**: Only that specific address can initialize markets
- **Recommendation**: Either remove this constraint or make it configurable

## Test Implementation

### Tests Created

#### 1. **initialize-market.test.ts**
- ✅ Test 1a: Verifies market config account data is configured correctly
- ✅ Test 1b: Checks authorization (tests fail appropriately when using wrong authority)
- Tests verify:
  - Market config data (name, description, expiration, owner)
  - VaultState initialization and field values
  - Conditional token mints creation
  - Vault account creation
  - PDA derivations

#### 2. **buy-bet.test.ts**
- ✅ Test 2a: Verifies conditional tokens are credited after buy operations
- ✅ Tests multiple sequential buy operations to verify accumulation
- ✅ Tests insufficient collateral error case
- Uses helper function `getUserCtAccountInfo` to verify CT balances
- Uses `isEqual` helper to handle bigint comparison with ±1 tolerance for rounding

#### 3. **sell-bet.test.ts**
- ✅ Test 3a: Verifies user can sell partial conditional tokens
- ✅ Test 3b: Verifies insufficient CT error when user tries to sell more than they own
- ✅ Tests selling all conditional tokens
- ✅ Tests user with no CT cannot sell
- Verifies collateral is returned correctly after selling

### Helper Functions Updated

#### In `tests/utils/instructions.ts`:
- ✅ `setupInitializeMarketTest`: Sets up market config for initialization tests
- ✅ `setupBuyBetTest`: Sets up market config + initialization for buy tests
- ✅ `setupSellBetTest`: Fixed to call `buyBet` instead of `sellBet` (was calling wrong function)
- ✅ `initialize`: Returns transaction signature for verification
- ✅ `buyBet`: Executes buy bet transaction
- ✅ `sellBet`: Executes sell bet transaction

#### In `tests/utils/util.ts`:
- ✅ `getUserCtAccountInfo`: Gets user's CT1 and CT2 account balances
- ✅ `isEqual`: Compares bigints with ±1 tolerance for rounding issues
- ✅ `marketResolutionInstruction`: Checks if market is resolved

### Test Execution Notes

**IMPORTANT**: Due to the contract issues listed above, some tests may fail until the contract is fixed:
1. Buy bet tests will likely fail due to incorrect signer seeds in minting
2. Sell bet tests will fail due to missing vault field in vault_state
3. Only tests that don't require buy/sell operations will pass

To run tests:
```bash
# Build the program first
anchor build

# Run all tests
anchor test

# Run specific test file
anchor test --skip-build tests/initialize-market.test.ts
```

## Recommendations

1. **Fix the contract issues** listed above before expecting all tests to pass
2. **Add auth_bump field** to VaultState initialization
3. **Set vault field** in VaultState during initialization
4. **Fix signer seeds** in buy_bet instruction to use AUTH_SEED
5. **Consider removing or making configurable** the hardcoded admin address constraint

## Test Coverage

- ✅ Market config creation and verification
- ✅ Initialize market with proper account setup
- ✅ Authority validation
- ✅ Buy bet operations (pending contract fix)
- ✅ Sell bet operations (pending contract fix)
- ✅ Conditional token balance verification
- ✅ Collateral transfer verification
- ✅ Error cases (insufficient funds, wrong authority, etc.)
- ⏭️ Get reward operations (skipped as requested)

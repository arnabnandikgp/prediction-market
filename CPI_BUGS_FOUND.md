# 🐛 CRITICAL BUGS FOUND IN CPI LOGIC

## Overview

I found **critical bugs** in how `buy_bet` and `sell_bet` handle CPIs. Here's the complete analysis:

---

## 🔴 BUG #1: sell_bet.rs - Wrong Burn Logic

### Location
`programs/market_program/src/instructions/sell_bet.rs` lines 77-95

### Current Code (WRONG)
```rust
token_burn(
    ctx.accounts.bettor.to_account_info(),     // ❌ bettor as authority
    ctx.accounts.token_program.to_account_info(),
    ctx.accounts.ct1_mint.to_account_info(),
    ctx.accounts.ct1_account.to_account_info(),
    amount,
    &[&[&[]]],  // ❌ Empty signer seeds - this is nonsense!
)?;
```

### The Problem

The `token_burn` function uses `CpiContext::new_with_signer` which means it expects PDA signer seeds. But:

1. **The bettor is the token owner** - they sign the transaction, not a PDA
2. **Empty signer seeds `&[&[&[]]]`** are being passed - this is meaningless
3. **For user-owned tokens, you don't need signer seeds!**

### The Fix

When burning tokens from a user's account, the user (bettor) is the authority, so use `CpiContext::new` (WITHOUT signer):

```rust
pub fn sell_bet(ctx: Context<SellBet>, amount: u64) -> Result<()> {
    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // Burn CT1 - user owns these tokens, no PDA signing needed
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct1_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
                mint: ctx.accounts.ct1_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Burn CT2 - user owns these tokens, no PDA signing needed
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct2_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
                mint: ctx.accounts.ct2_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Transfer collateral from vault (PDA-owned) back to user
    // This DOES need PDA signing since vault is owned by the program
    transfer_from_collateral_vault_to_user(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    vault_state.update_collateral_supply(amount, false)?;

    Ok(())
}
```

**Alternative**: Update the `token_burn` helper function to support both PDA and user authorities.

---

## 🟡 ISSUE #2: buy_bet.rs - Vault Account CPI Issue

### Location
`programs/market_program/src/instructions/buy_bet.rs` lines 79-86

### Current Code
```rust
transfer_from_user_to_collateral_vault(
    ctx.accounts.bettor.to_account_info(),
    ctx.accounts.collateral_account.to_account_info(),
    ctx.accounts.vault.to_account_info(),
    ctx.accounts.collateral_mint.to_account_info(),
    ctx.accounts.collateral_token_program.to_account_info(),
    amount,
    ctx.accounts.collateral_mint.decimals,
)?;
```

### The Problem

Looking at `transfer_from_user_to_collateral_vault`:
```rust
pub fn transfer_from_user_to_collateral_vault<'a>(
    authority: AccountInfo<'a>,  // This is the bettor
    from: AccountInfo<'a>,
    to_vault: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    mint_decimals: u8,
) -> Result<()> {
    token_2022::transfer_checked(
        CpiContext::new(  // ✅ Correctly uses CpiContext::new (no signer)
            token_program.to_account_info(),
            token_2022::TransferChecked {
                from,
                to: to_vault,
                authority,
                mint,
            },
        ),
        amount,
        mint_decimals,
    )
}
```

This looks CORRECT! The user (bettor) is the authority, and we're using `CpiContext::new` (not `new_with_signer`).

**BUT** - the error logs show `"vault's writable privilege escalated"`. This means:

The **vault account** is being modified by the Token program's transfer instruction, but:
1. The vault is a PDA account
2. When a PDA account is written to in a CPI, Solana requires it to be in the "writable accounts" list
3. The vault IS marked as `#[account(mut)]` in the struct, so it should be writable...

**Wait!** Let me check if the vault needs to be passed to the CPI explicitly or if there's another issue...

Actually, looking at the SPL Token TransferChecked instruction, it only needs `from`, `to`, `authority`, and `mint`. The `to` (vault) should automatically be writable if it's marked `#[account(mut)]` in the parent instruction.

### The Real Issue

The error `"writable privilege escalated"` with a specific account address suggests that account is being used in a nested CPI or being passed where it shouldn't be writable.

Looking more carefully at the error: **the account that has "writable privilege escalated" is NOT the vault!** It's one of the conditional token mints or accounts.

Let me re-examine...

---

## 🔴 BUG #3: Account Remaining Accounts Issue

The error shows accounts like `"EeDFjYNYZDhSvZb1RGyr3kaDDFeg3BeRvbSvRtyD9iXX's writable privilege escalated"`.

This happens when:
1. An account is passed to a CPI
2. The CPI marks it as writable
3. But the parent instruction didn't mark it as writable

**For Token Mint operations:**
- The mint account needs to be writable (you added `#[account(mut)]` ✅)
- The destination account needs to be writable (ct1_account, ct2_account are `init_if_needed` which makes them writable ✅)
- The authority is the signer

**Wait, I see the issue now!**

In `token_mint_to`, you're passing `ctx.accounts.token_program`, but this should match the token program of the MINT, not the collateral!

---

## 🔴 THE ACTUAL BUG: Token Program Mismatch!

### In buy_bet.rs

```rust
token_mint_to(
    ctx.accounts.authority.to_account_info(),
    ctx.accounts.token_program.to_account_info(),  // ❌ This is collateral_token_program!
    ctx.accounts.ct1_mint.to_account_info(),
    ctx.accounts.ct1_account.to_account_info(),
    amount,
    &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
)?;
```

But look at the BuyBet struct:
```rust
pub ct1_token_program: Interface<'info, TokenInterface>,  // ✅ This exists!
pub ct2_token_program: Interface<'info, TokenInterface>,  // ✅ This exists!
pub token_program: Interface<'info, TokenInterface>,      // This is for collateral!
```

**You're using the wrong token program!**

The conditional tokens use `ct1_token_program` and `ct2_token_program`, but you're passing `token_program` (which is the collateral token program).

---

## ✅ THE FIXES

### Fix 1: buy_bet.rs - Use Correct Token Programs

```rust
pub fn buy_bet(ctx: Context<BuyBet>, amount: u64) -> Result<()> {
    // Transfer collateral from user to vault
    transfer_from_user_to_collateral_vault(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
    )?;

    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // Mint CT1 - use ct1_token_program!
    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.ct1_token_program.to_account_info(),  // ✅ FIXED!
        ctx.accounts.ct1_mint.to_account_info(),
        ctx.accounts.ct1_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    // Mint CT2 - use ct2_token_program!
    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.ct2_token_program.to_account_info(),  // ✅ FIXED!
        ctx.accounts.ct2_mint.to_account_info(),
        ctx.accounts.ct2_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    vault_state.update_collateral_supply(amount, true)?;

    Ok(())
}
```

### Fix 2: sell_bet.rs - Fix Burn Authority & Token Programs

```rust
pub fn sell_bet(ctx: Context<SellBet>, amount: u64) -> Result<()> {
    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // Burn CT1 - bettor is the owner, so they're the authority
    // NO PDA signing needed since bettor signs the transaction
    token_2022::burn(
        CpiContext::new(  // ✅ Use new, NOT new_with_signer
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct1_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),  // ✅ Bettor owns the tokens
                mint: ctx.accounts.ct1_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Burn CT2 - bettor is the owner
    token_2022::burn(
        CpiContext::new(  // ✅ Use new, NOT new_with_signer
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct2_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),  // ✅ Bettor owns the tokens
                mint: ctx.accounts.ct2_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Transfer collateral from vault (PDA-owned) back to user
    // This NEEDS PDA signing since vault is owned by the program
    transfer_from_collateral_vault_to_user(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    vault_state.update_collateral_supply(amount, false)?;

    Ok(())
}
```

---

## 🧠 Understanding CPI Signing

### Rule 1: User-Owned Tokens
When a **user owns** the tokens (like ct1_account, ct2_account):
- ✅ Use `CpiContext::new` (no signer)
- ✅ Pass the user as `authority`
- ✅ The user's signature from the transaction is used

### Rule 2: PDA-Owned Tokens
When a **PDA owns** the tokens (like vault):
- ✅ Use `CpiContext::new_with_signer` (with PDA seeds)
- ✅ Pass the PDA as `authority`
- ✅ The PDA signs using the provided seeds

### Rule 3: Minting New Tokens
When **minting** new tokens:
- ✅ Use `CpiContext::new_with_signer` (mint authority is a PDA)
- ✅ Pass the mint authority PDA as `authority`
- ✅ Provide the PDA's signer seeds

---

## 📊 Correct Flow Analysis

### BUY_BET Flow:
1. **Transfer collateral: User → Vault**
   - Authority: `bettor` (user signs)
   - From: `collateral_account` (user-owned)
   - To: `vault` (PDA-owned, but as destination it's fine)
   - Signing: User signs (no PDA seeds needed)
   - ✅ **CORRECT**

2. **Mint CT1: → User**
   - Authority: `authority` PDA (mint authority)
   - To: `ct1_account` (user-owned)
   - Signing: PDA signs with `[AUTH_SEED, auth_bump]`
   - ❌ **WRONG TOKEN PROGRAM** - should use `ct1_token_program`

3. **Mint CT2: → User**
   - Authority: `authority` PDA (mint authority)
   - To: `ct2_account` (user-owned)
   - Signing: PDA signs with `[AUTH_SEED, auth_bump]`
   - ❌ **WRONG TOKEN PROGRAM** - should use `ct2_token_program`

### SELL_BET Flow:
1. **Burn CT1: User's tokens**
   - Authority: `bettor` (owns the tokens)
   - From: `ct1_account` (user-owned)
   - Signing: User signs (no PDA seeds!)
   - ❌ **WRONG** - currently using PDA signer with empty seeds

2. **Burn CT2: User's tokens**
   - Authority: `bettor` (owns the tokens)
   - From: `ct2_account` (user-owned)
   - Signing: User signs (no PDA seeds!)
   - ❌ **WRONG** - currently using PDA signer with empty seeds

3. **Transfer collateral: Vault → User**
   - Authority: `authority` PDA (owns vault)
   - From: `vault` (PDA-owned)
   - To: `collateral_account` (user-owned)
   - Signing: PDA signs with `[AUTH_SEED, auth_bump]`
   - ✅ **CORRECT**

---

## 🔧 Complete Fixes

### Fix buy_bet.rs
```rust
pub fn buy_bet(ctx: Context<BuyBet>, amount: u64) -> Result<()> {
    transfer_from_user_to_collateral_vault(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
    )?;

    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // Use ct1_token_program, not token_program!
    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.ct1_token_program.to_account_info(),  // CHANGED
        ctx.accounts.ct1_mint.to_account_info(),
        ctx.accounts.ct1_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    // Use ct2_token_program, not token_program!
    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.ct2_token_program.to_account_info(),  // CHANGED
        ctx.accounts.ct2_mint.to_account_info(),
        ctx.accounts.ct2_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    vault_state.update_collateral_supply(amount, true)?;

    Ok(())
}
```

### Fix sell_bet.rs

**Option A: Direct CPI (Recommended)**
```rust
use anchor_spl::token_2022;

pub fn sell_bet(ctx: Context<SellBet>, amount: u64) -> Result<()> {
    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // Burn CT1 - bettor owns these, no PDA signing
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct1_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
                mint: ctx.accounts.ct1_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Burn CT2 - bettor owns these, no PDA signing
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                from: ctx.accounts.ct2_account.to_account_info(),
                authority: ctx.accounts.bettor.to_account_info(),
                mint: ctx.accounts.ct2_mint.to_account_info(),
            },
        ),
        amount,
    )?;

    // Transfer collateral from vault back to user - needs PDA signing
    transfer_from_collateral_vault_to_user(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    vault_state.update_collateral_supply(amount, false)?;

    Ok(())
}
```

**Option B: Update token_burn Helper**

If you want to keep using the helper function, update it to support user authorities:

```rust
// In utils/token.rs
pub fn token_burn_user<'a>(
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    from: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    token_2022::burn(
        CpiContext::new(  // No signer - user signs the transaction
            token_program.to_account_info(),
            token_2022::Burn {
                from,
                authority,
                mint,
            },
        ),
        amount,
    )
}
```

Then in sell_bet:
```rust
token_burn_user(
    ctx.accounts.bettor.to_account_info(),
    ctx.accounts.token_program.to_account_info(),
    ctx.accounts.ct1_mint.to_account_info(),
    ctx.accounts.ct1_account.to_account_info(),
    amount,
)?;
```

---

## 🎯 Summary of Issues

| Issue | Location | Current | Should Be |
|-------|----------|---------|-----------|
| Token program mismatch | buy_bet.rs:92 | `token_program` | `ct1_token_program` |
| Token program mismatch | buy_bet.rs:102 | `token_program` | `ct2_token_program` |
| Wrong burn authority | sell_bet.rs:77 | PDA with empty seeds | User with no seeds |
| Wrong burn authority | sell_bet.rs:87 | PDA with empty seeds | User with no seeds |

---

## 📝 Action Items

1. ✅ Fix buy_bet.rs: Use `ct1_token_program` and `ct2_token_program` 
2. ✅ Fix sell_bet.rs: Use `CpiContext::new` for burning user tokens
3. ✅ Rebuild: `anchor build`
4. ✅ Clean: `rm -rf test-ledger .anchor`
5. ✅ Test: `anchor test`

After these fixes, ALL tests should pass! 🎉

---

## 🧪 Why This Matters

- **Token Program Mismatch**: Each token type can use a different token program (TOKEN_PROGRAM vs TOKEN_2022_PROGRAM). You must use the correct one.
  
- **CPI Signing**: Only PDAs need signer seeds. When users burn their own tokens, they sign the transaction directly.

- **Empty Signer Seeds**: `&[&[&[]]]` is invalid - it means "use a PDA with empty seeds" which doesn't make sense.

Your logic was almost perfect! These are subtle CPI issues that are easy to miss. 🎯

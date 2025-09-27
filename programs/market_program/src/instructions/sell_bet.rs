// for withdrawing the collateral from vault by coalescing the conditional tokens to a single collateral token
// before the expiration date and the question has not resolved
// A + A' = C
// where A is the collateral token and A' is the conditional token
// and C is the collateral token

use crate::states::*;
use crate::utils::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct SellBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    /// CHECK: a authority pda account that is owned by this contract
    #[account(
        seeds = [
            crate::AUTH_SEED.as_bytes(),
        ],
        bump,
    )]
    pub authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = collateral_mint,
        token::authority = bettor
    )]
    pub collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub vault_state: AccountLoader<'info, VaultState>,


    #[account(
        mut,
        constraint = vault.key() == vault_state.load()?.vault
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub ct1_mint: InterfaceAccount<'info, Mint>,
    pub ct2_mint: InterfaceAccount<'info, Mint>,

    // user's token accounts for the conditional tokens
    #[account(
        mut,
        associated_token::mint = ct1_mint,
        associated_token::authority = bettor,
    )]
    pub ct1_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = ct2_mint,
        associated_token::authority = bettor,
    )]
    pub ct2_account: InterfaceAccount<'info, TokenAccount>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub collateral_token_program: Interface<'info, TokenInterface>,

    // TODO : add the vault account of the collateral
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn sell_bet(ctx: Context<SellBet>, amount: u64) -> Result<()> {

    let mut vault_state = ctx.accounts.vault_state.load_mut()?;

    // burn the conditional tokens
    token_burn(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.ct1_mint.to_account_info(),
        ctx.accounts.ct1_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

    token_burn(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.ct2_mint.to_account_info(),
        ctx.accounts.ct2_account.to_account_info(),
        amount,
        &[&[crate::AUTH_SEED.as_bytes(), &[vault_state.auth_bump]]],
    )?;

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

// will be called by users to obtain equal amount of conditional tokens
// for the collateral they have deposited

use crate::utils::*;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface};
// use anchor_spl::token::Mint;
#[derive(Accounts)]
pub struct BuyBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

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

    // token mints of the conditional tokens
    pub ct1_mint: InterfaceAccount<'info, Mint>,
    // pub ct1_mint: Account<'info, Mint>,

    #[account(mut)]
    pub vault_state: AccountLoader<'info, VaultState>,


    #[account(
        mut,
        constraint = vault.key() == vault_state.load()?.vault
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub ct2_mint: InterfaceAccount<'info, Mint>,

    // user's token accounts for the conditional tokens
    #[account(
        init_if_needed,
        payer= bettor,
        associated_token::mint = ct1_mint,
        associated_token::authority = bettor,
        associated_token::token_program = token_program,
    )]
    pub ct1_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer= bettor,
        associated_token::mint = ct2_mint,
        associated_token::authority = bettor,
        associated_token::token_program = token_program,
    )]
    pub ct2_account: InterfaceAccount<'info, TokenAccount>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub collateral_token_program: Interface<'info, TokenInterface>,

    // TODO : add the vault account of the collateral

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


pub fn buy_bet(ctx: Context<BuyBet>, amount: u64) -> Result<()> {
    // logic to sign the transaction from user to send the collateral from

    transfer_from_user_to_collateral_vault(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.collateral_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.collateral_mint.to_account_info(),
        ctx.accounts.collateral_token_program.to_account_info(),
        amount,
        ctx.accounts.collateral_mint.decimals,
    )?;

    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.ct1_mint.to_account_info(),
        ctx.accounts.ct1_account.to_account_info(),
        amount,
        &[&[b"bettor", ctx.accounts.vault.key().as_ref()]],
    )?;

    token_mint_to(
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.ct2_mint.to_account_info(),
        ctx.accounts.ct2_account.to_account_info(),
        amount,
        &[&[b"bettor", ctx.accounts.vault.key().as_ref()]],
    )?;

    // update the vault state with the new collateral amount.
    let mut vault_state = ctx.accounts.vault_state.load_mut()?;
    vault_state.update_collateral_supply(amount, true)?;

    Ok(())

}

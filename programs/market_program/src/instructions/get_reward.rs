// will recieve the reward from the user and will transfer the 
// the reward in form of collateral if the user's token are the ones that
// have been asked for in the market config// will be called by users to obtain equal amount of conditional tokens
// for the collateral they have deposited

use crate::utils::*;
use crate::states::*;
use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
#[derive(Accounts)]
pub struct GetReward<'info> {
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

    pub ct_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = ct_mint,
        associated_token::authority = bettor,
    )]
    pub ct_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault_state: AccountLoader<'info, VaultState>,

    #[account(
        mut,
        constraint = vault.key() == vault_state.load()?.vault
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub collateral_token_program: Interface<'info, TokenInterface>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn get_reward(ctx: Context<GetReward>, amount: u64) -> Result<()> {
    // logic to sign the transaction from user to send the collateral from
    let mut vault_state = ctx.accounts.vault_state.load_mut()?;
    if vault_state.resolution == 0 && Clock::get()?.unix_timestamp < vault_state.vault_expiration {
        return Err(ErrorCode::MarketNotResolved.into());
    }
    // check to see if the users token account is of the same mint as that of the winning conditional token
    if ctx.accounts.ct_mint.key() != vault_state.winning_ct_mint {
        return Err(ErrorCode::WrongWinningToken.into());
    }

    token_burn(
        ctx.accounts.bettor.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.ct_mint.to_account_info(),
        ctx.accounts.ct_account.to_account_info(),
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

    // update the vault state with the new collateral amount.
    vault_state.update_collateral_supply(amount, false)?;

    Ok(())

}

use anchor::prelude::*;
use anchor_lang::{accounts::account_loader, prelude::{Context, Interface, InterfaceAccount, Program, Signer, System}};
use anchor_spl::{metadata::mpl_token_metadata::instructions::Mint, token_interface::TokenInterface};
use crate::states::*;

#[derive(Accounts)]
pub struct InitializeWithPermission<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        seeds = [
            POOL_LP_MINT_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        bump,
        mint::decimals = 9,
        mint::authority = authority,
        payer = payer,
        mint::token_program = token_program,
    )]
    pub ctf_mint_A: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        seeds = [
            POOL_LP_MINT_SEED.as_bytes(),
            pool_state.key().as_ref(),
        ],
        bump,
        mint::decimals = 9,
        mint::authority = authority,
        payer = payer,
        mint::token_program = token_program,
    )]
    pub ctf_mint_nA: Box<InterfaceAccount<'info, Mint>>,


    pub system_program: Program<'info, System>,
}

pub fn initialize_with_permission(ctx: Context<InitializeWithPermission>) -> Result<()> {
    Ok(())
}
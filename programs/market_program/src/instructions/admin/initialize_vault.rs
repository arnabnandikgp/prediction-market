use anchor_lang::prelude::*;
use anchor_spl::{metadata::mpl_token_metadata::instructions::Mint, token::{Token, TokenAccount}};
use crate::states::*;

#[derive(Accounts)]
#[instruction(index: u16, collateral: Pubkey)]

// should not be a simple account but rather a token account for the collateral with the signer being the owner
pub struct CreateCollateralVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub token_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = token_vault.mint
    )]
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = signer,
        token::mint = collateral_mint,
        token::authority = signer,
        token::token_program = token_program,
        seeds = [b"token", signer.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn create_collateral_vault(ctx: Context<CreateCollateralVault>, index: u16, name: String, description: String, expiration: i64) -> Result<()> {
    let somethinig = &mut ctx.accounts.vault;
    Ok(())
}

// make sure the vault has a ata for the collateral i.e USDC and then mak
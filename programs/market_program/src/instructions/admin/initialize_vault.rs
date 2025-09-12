use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(index: u16)]
// should not be a simple account but rather a token account for the collateral with the signer being the owner
pub struct CreateCollateralVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        token::mint = mint,
        token::authority = token_account,
        token::token_program = token_program,
        seeds = [b"token", signer.key().as_ref()],
        bump,
    )]
    pub Vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn create_collateral_vault(ctx: Context<CreateCollateralVault>, index: u16, name: String, description: String, expiration: i64) -> Result<()> {
    ctx.accounts.vault.bump = ctx.bumps.vault;
    ctx.accounts.vault.index = index;
    ctx.accounts.vault.owner = ctx.accounts.signer.key();
    Ok(())
}


// make sure the vault has a ata for the collateral i.e USDC and then mak
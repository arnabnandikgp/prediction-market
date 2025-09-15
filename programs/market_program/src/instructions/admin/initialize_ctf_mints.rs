use crate::error::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;
use std::ops::DerefMut;

// needs to modify the market config to add the ctf mints
// 
#[derive(Accounts)]
pub struct InitializeCtfMints {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + CtfMint::INIT_SPACE,
    )]
    pub ctf_mint: Account<'info, CtfMint>,
}

pub fn handler(ctx: Context<InitializeCtfMints>) -> Result<()> {
    Ok(())
}



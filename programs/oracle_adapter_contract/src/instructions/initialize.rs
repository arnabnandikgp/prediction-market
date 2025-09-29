use std::ops::DerefMut;
use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub market_config: Account<'info, MarketConfig>,

    #[account(
        init,
        payer = payer,
        seeds = [
            b"resolution_config",
            market_config.key().as_ref(),
        ],
        bump,
        space = ResolutionConfig::LEN,
    )]

    pub resolution_config: Account<'info, ResolutionConfig>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {

    let resolution_config = ctx.accounts.resolution_config.deref_mut();
    resolution_config.market_config = ctx.accounts.market_config.key();
    resolution_config.resolution_config_bump = ctx.bumps.resolution_config;
    resolution_config.resolution_config_created_at = Clock::get()?.unix_timestamp;
    resolution_config.resolution_config_expiration = Clock::get()?.unix_timestamp + 1000000000;

    Ok(())
}
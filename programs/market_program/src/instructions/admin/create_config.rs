use std::ops::DerefMut;
use anchor_lang::prelude::*;
use crate::states::*;

// config_account account validation and create_config instruction handler

#[derive(Accounts)]
#[instruction(index: u16)]
pub struct CreateMarketConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        seeds = [
            MARKET_CONFIG_SEED.as_bytes(),
            &index.to_be_bytes()
        ],
        bump,
        payer = signer,
        space = 8 + MarketConfig::INIT_SPACE,
    )]
    pub market_config: Account<'info, MarketConfig>,

    pub system_program: Program<'info, System>,
}

pub fn create_market_config(ctx: Context<CreateMarketConfig>, index: u16, name: String, description: String, expiration: i64) -> Result<()> {
    ctx.accounts.market_config.bump = ctx.bumps.market_config;
    ctx.accounts.market_config.index = index;
    ctx.accounts.market_config.owner = ctx.accounts.signer.key();
    ctx.accounts.market_config.name = name;
    ctx.accounts.market_config.description = description;
    ctx.accounts.market_config.created_at = Clock::get()?.unix_timestamp;
    ctx.accounts.market_config.expiration = expiration;
    Ok(())
}
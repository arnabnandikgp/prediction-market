use std::ops::DerefMut;

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use market_program::{self, cpi::accounts::ResolveMarket, program::MarketProgram, MarketConfig, VaultState, OracleAuthority};
 
use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Trigger<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub market_config: Account<'info, MarketConfig>,

    #[account(
        seeds = [
            b"resolution_config",
            market_config.key().as_ref(),
        ],
        bump = resolution_config.resolution_config_bump,
    )]
    pub resolution_config: Account<'info, ResolutionConfig>,

    #[account(
        init,
        payer = payer,
        seeds = [b"oracle-adapter-pda"],
        bump,
        space = OracleAuthority::INIT_SPACE,
    )]
    pub oracle_adapter_pda: Account<'info, OracleAuthority>,

    pub market_program: Program<'info, MarketProgram>,
    pub vault_state: AccountLoader<'info, VaultState>,

    pub price_update: Account<'info, PriceUpdateV2>,
    pub system_program: Program<'info, System>,
}


pub fn trigger(ctx: Context<Trigger>) -> Result<()> {
    let price_update = &mut ctx.accounts.price_update;

        if Clock::get()?.unix_timestamp > ctx.accounts.resolution_config.resolution_config_expiration {
            return Err(ErrorCode::ResolutionConfigExpired.into());
        }
        let maximum_age: u64 = 30;
        let feed_id: [u8; 32] = get_feed_id_from_hex(
            "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        )?;
        let price = price_update.get_price_no_older_than(&Clock::get()?, maximum_age, &feed_id)?;


        msg!(
            "The price is ({} ± {}) * 10^{}",
            price.price,
            price.conf,
            price.exponent
        );

        let oracle_authority = ctx.accounts.oracle_adapter_pda.deref_mut();
        oracle_authority.resolution_price = price.price;

        //send the price to the market program to resolve the market using cpi
        let cpi_program = ctx.accounts.market_program.to_account_info();
        let cpi_accounts = ResolveMarket {
            oracle_adapter_pda: ctx.accounts.oracle_adapter_pda.to_account_info(),
            market_config: ctx.accounts.market_config.to_account_info(),
            vault_state: ctx.accounts.vault_state.to_account_info(),
        };
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        market_program::cpi::resolve_market(cpi_context)?;

        Ok(())
}
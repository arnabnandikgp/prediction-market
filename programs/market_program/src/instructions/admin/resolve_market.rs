use std::ops::DerefMut;

use crate::states::*;
use anchor_lang::prelude::*;


// config_account account validation and create_config instruction handler
#[derive(Accounts)]
#[instruction(index: u16)]
pub struct ResolveMarket<'info> {
    // TODO : change this key with the oracle adapter contract
    /// CHECK: oracle adapter pda account
    #[account(
        seeds = [b"oracle-adapter-pda"],
        bump = oracle_adapter_pda.bump,
        owner = pubkey!("11111111111111111111111111111111")
    )]
    pub oracle_adapter_pda: Account<'info, OracleAuthority>,

    #[account(mut)]
    pub market_config: Account<'info, MarketConfig>,

    #[account(mut)]
    pub vault_state: AccountLoader<'info, VaultState>,
}
// called by the admin
pub fn resolve_market(ctx: Context<ResolveMarket>) -> Result<()> {
    let mut vault_state = ctx.accounts.vault_state.load_init()?;
    vault_state.resolve_market(ctx.accounts.market_config.ct1_mint)?;

    let market_config = ctx.accounts.market_config.deref_mut();
    market_config.market_resolution = true;

    let oracle_authority = ctx.accounts.oracle_adapter_pda.deref_mut();
    if oracle_authority.resolution_price > oracle_authority.target_price {
        vault_state.resolve_market(ctx.accounts.market_config.ct1_mint)?;
    } else {
        vault_state.resolve_market(ctx.accounts.market_config.ct2_mint)?;
    }

    Ok(())
}

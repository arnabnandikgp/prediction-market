use std::ops::DerefMut;

use crate::states::*;
use anchor_lang::prelude::*;
// config_account account validation and create_config instruction handler
#[derive(Accounts)]
#[instruction(index: u16)]
pub struct ResolveMarket<'info> {
    #[account(
    address = pubkey!("11111111111111111111111111111111"))]
    // TODO : change this key with the oracle adapter contract
    pub oracle_adapter: Signer<'info>,

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

    Ok(())
}

// for withdrawing the collateral from vault by coalescing the conditional tokens to a single collateral token
// before the expiration date and the question has not resolved
// A + A' = C
// where A is the collateral token and A' is the conditional token
// and C is the collateral token

use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, 

    pub vault_state: Account<'info, VaultState>,

    pub market_config: Account<'info, MarketConfig>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>) -> Result<()> {
    Ok(())
}
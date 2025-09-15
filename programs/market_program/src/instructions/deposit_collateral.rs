use anchor_lang::prelude::*;
use crate::states::*;
use crate::admin::*;


#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}

pub fn deposit_collateral(ctx: Context<DepositCollateral>) -> Result<()> {
    merge_to_collateral(ctx)?;
    Ok(())
}
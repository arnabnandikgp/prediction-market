use std::ops::DerefMut;
use anchor_lang::prelude::*;
use crate::states::*;

// this function is based on the fact that there can never be more conditional tokens combined than the collateral as 
// this programs is the only one that can mint the conditional tokens
#[derive(Accounts)]
#[instruction(index: u16)]
pub struct MergeToCollateral<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

}

pub fn merge_to_collateral(ctx: Context<MergeToCollateral>) -> Result<()> {
    // recieve the conditional tokens from the user
    // burn the condtional tokens from the user
    // transfer some amount of collateral to the user
    Ok(())
}
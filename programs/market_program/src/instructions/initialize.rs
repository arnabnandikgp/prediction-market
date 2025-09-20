// all the things will happen here
// 1. create the condition token mints
// 2. create the vault
// 3. update the market config 
// 4. create and update the vault state

use anchor_lang::prelude::*;
use anchor_spl::{token::TokenAccount, token_interface::{Mint, TokenInterface}};
use crate::states::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = pubkey!("11111111111111111111111111111111"))] // TODO replace with the admin key
    pub creator: Signer<'info>,

    pub market_config: Account<'info, MarketConfig>,

    // initialize token mints for both the conditional tokens
    // we use seeds to definitively derive at the ctf tokens address
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = creator.key(),
        mint::freeze_authority = creator.key(),
        seeds = [b"conditional_token1",
                market_config.key().as_ref()],
        bump
    )]
    pub ct1_mint: InterfaceAccount<'info, Mint>,


    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = creator.key(),
        mint::freeze_authority = creator.key(),
        seeds = [b"conditional_token2",
                market_config.key().as_ref()],
        bump
    )]
    pub ct2_mint: InterfaceAccount<'info, Mint>,

    pub vault_state: UncheckedAccount<'info>,

    // the vault to store the collateral
    #[account(
        mut, 
        constraint = vault.key() == vault_state.key(), // TODO: change this to load method of vault returning a Ref to the account data structure
   )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,




    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>

}


pub fn Initialize(ctx: Context<Initialize>) -> Result<()> {
    // update the vault_state with the mints of the conditional tokens


    Ok(())

    
}



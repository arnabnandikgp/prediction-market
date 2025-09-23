// will be called by users to obtain equal amount of conditional tokens
// for the collateral they have deposited

use crate::admin::*;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface};
// use anchor_spl::token::Mint;
#[derive(Accounts)]
pub struct BuyBet<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // token mints of the conditional tokens
    pub ct1_mint: InterfaceAccount<'info, Mint>,
    // pub ct1_mint: Account<'info, Mint>,

    pub ct2_mint: InterfaceAccount<'info, Mint>,
    // pub ct2_mint: Account<'info, Mint>,

    // user's token accounts for the conditional tokens
    #[account(
        init_if_needed,
        payer= signer,
        associated_token::mint = ct1_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub ct1_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer= signer,
        associated_token::mint = ct2_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub ct2_account: InterfaceAccount<'info, TokenAccount>,

    // TODO : add the vault account of the collateral

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


pub fn buy_bet(ctx: Context<BuyBet>, collateral_amount: u64){
    // logic to sign the transaction from user to send the collateral from
    // his account to the vault.
    // mint the conditional tokens to the user.
    // update the vault state with the new collateral amount.
    // update the market config with the new collateral amount.
    // update the vault state with the new conditional tokens.
    // update the market config with the new conditional tokens.
    // update the vault state with the new conditional tokens.
}

use std::ops::DerefMut;

// all the things will happen here
// 1. create the condition token mints
// 2. create the vault and make it a token account that is owned by this contract
// 3. update the market config
// 4. create and update the vault state
// the authority account is a pda account that is owned by this contract
// the ct1 mint is classified to be the positive asserting case for the questions outcome and vice versa.
use crate::states::*;
use crate::utils::*;
use crate::{error::ErrorCode};

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};
pub const AUTH_SEED: &str = "vault_and_lp_mint_auth_seed";

#[derive(Accounts)]
pub struct Initialize<'info> {
    // #[account(mut, address = pubkey!("Hoamid9gD8dEgLrirgt3gNnAWhmxYe5LSKrJJUGGd4DA"))]
    // TODO replace with the admin key
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub market_config: Account<'info, MarketConfig>,

    /// CHECK: a authority pda account that is owned by this contract
    #[account(
        seeds = [
            crate::AUTH_SEED.as_bytes(),
        ],
        bump,
    )]
    pub authority: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [
            b"conditional_token1",
            vault_state.key().as_ref(),
        ],
        bump,
        mint::decimals = 9,
        mint::authority = authority,
        payer = creator,
        mint::token_program = token_program,
    )]
    pub ct1_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        seeds = [
            b"conditional_token2",
            vault_state.key().as_ref(),
        ],
        bump,
        mint::decimals = 9,
        mint::authority = authority,
        payer = creator,
        mint::token_program = token_program,
    )]
    pub ct2_mint: Box<InterfaceAccount<'info, Mint>>,

    pub ct1_token_program: Interface<'info, TokenInterface>,
    pub ct2_token_program: Interface<'info, TokenInterface>,

    /// CHECK: vault state account should be a pda account owned by the contract
    #[account(mut)]
    pub vault_state: UncheckedAccount<'info>,

    /// CHECK: vault account that is also owned by the contract and derived accordingly
    #[account(
        mut,
        seeds = [
            b"vault",
            vault_state.key().as_ref(),
        ],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub collateral_token_program: Interface<'info, TokenInterface>,

    //     // the vault to store the collateral
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //this makes the passed vault account a token account that has some given seeds 
    create_token_account(
        &ctx.accounts.authority.to_account_info(),
        &ctx.accounts.creator.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.collateral_mint.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.collateral_token_program.to_account_info(),
        &[
            b"vault",
            ctx.accounts.vault_state.key().as_ref(),
            &[ctx.bumps.vault],
        ],
    )?;

    let vault_state_loader = create_vault_state(
        &ctx.accounts.creator.to_account_info(),
        &ctx.accounts.vault_state.to_account_info(),
        &ctx.accounts.market_config.to_account_info(),
        &ctx.accounts.collateral_mint.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;
    let vault_state = &mut vault_state_loader.load_init()?;

    vault_state.initialize(
        ctx.bumps.authority,
        ctx.accounts.market_config.key(),
        ctx.accounts.vault.key(),
        ctx.accounts.creator.key(),
        ctx.accounts.market_config.created_at,
        ctx.accounts.market_config.expiration,
        ctx.accounts.ct1_mint.key(),
        ctx.accounts.ct2_mint.key(),
        ctx.accounts.ct1_token_program.key(),
        ctx.accounts.ct2_token_program.key(),
    )?;

    msg!("DEBUG Initialize - Authority bump: {}", ctx.bumps.authority);
    msg!("DEBUG Initialize - Authority address: {}", ctx.accounts.authority.key());
    msg!("DEBUG Initialize - Vault address: {}", ctx.accounts.vault.key());
    msg!("DEBUG Initialize - Creator passed: {}", ctx.accounts.creator.key());
    msg!("DEBUG Initialize - VaultState creator stored: {}", vault_state.vault_creator);

    // update the market config with the vault state, vault, conditional token mints, and market resolution
    let market_config = ctx.accounts.market_config.deref_mut();
    market_config.vault_state = ctx.accounts.vault_state.key();
    market_config.vault = ctx.accounts.vault.key();
    market_config.ct1_mint = ctx.accounts.ct1_mint.key();
    market_config.ct2_mint = ctx.accounts.ct2_mint.key();
    market_config.market_resolution = false;
    Ok(())
}
   
pub fn create_vault_state<'info>(
    creator: &AccountInfo<'info>,
    vault_state: &AccountInfo<'info>,
    market_config: &AccountInfo<'info>,
    collateral_mint: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<AccountLoad<'info, VaultState>> {
    let (expect_pda_address, bump) = Pubkey::find_program_address(
        &[
            b"vault_state",
            market_config.key().as_ref(),
            collateral_mint.key().as_ref(),
        ],
        &crate::id(),
    );

    if expect_pda_address != vault_state.key() {
        return Err(ErrorCode::InvalidPublicKey.into());
    }

    token::create_or_allocate_account(
        &crate::id(),
        creator.to_account_info(),
        system_program.to_account_info(),
        vault_state.clone(),
        &[
            b"vault_state",
            market_config.key().as_ref(),
            collateral_mint.key().as_ref(),
            &[bump]
        ],
        VaultState::LEN,
    )?;

    Ok(AccountLoad::<VaultState>::try_from_unchecked(
        &crate::id(),
        &vault_state,
    )?)
}

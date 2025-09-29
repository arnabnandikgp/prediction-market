use anchor_lang::prelude::*;

pub const MARKET_CONFIG_SEED: &str = "market_config";

/// Holds the current owner of the factory
#[account]
#[derive(Default, Debug)]
#[derive(InitSpace)]
pub struct MarketConfig {
    /// Bump to identify PDA
    pub bump: u8,
    /// Config index
    pub index: u16,
    /// The market owner and creator
    pub owner: Pubkey,
    /// the market name
    #[max_len(100)]
    pub name: String,
    /// the market description
    #[max_len(100)]
    pub description: String,
    /// the market created at
    pub created_at: i64,
    /// the market expiration
    pub expiration: i64,
    /// padding
    pub padding: [u64; 15],
    // the vault token account for the collateral
    pub vault_state: Pubkey,

    pub vault: Pubkey,
    // conditional token mint 1
    pub ct1_mint: Pubkey,
    // conditional token mint 2
    pub ct2_mint: Pubkey,

    pub ct1_vault_token_account: Pubkey,
    pub ct2_vault_token_account: Pubkey,

    pub market_resolution: bool,
}


// market_config.bump = ctx.bumps.market_config;
// market_config.index = index;
// market_config.owner = ctx.accounts.signer.key();
// market_config.name = name;
// market_config.description = description;
// market_config.created_at = Clock::get()?.unix_timestamp;
// market_config.expiration = expiration;
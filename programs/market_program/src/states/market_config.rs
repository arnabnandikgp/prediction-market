use anchor_lang::prelude::*;

pub const MARKET_CONFIG_SEED: &str = "amm_config";

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
    pub vault: Pubkey,
    // conditional token mint 1
    pub ctf_mint_1: Pubkey,
    // conditional token mint 2
    pub ctf_mint_2: Pubkey,
}


use anchor_lang::prelude::*;

pub const COLLATERAL_VAULT_SEED: &str = "collateral_vault";

/// Holds the current owner of the factory
#[account]
#[derive(Default, Debug)]
#[deive(InitSpace)]
pub struct CollateralVault {
    /// Bump to identify PDA
    pub bump: u8,
    /// Config index
    pub market_config: Pubkey,
    /// Collateral vault owner
    pub owner: Pubkey,
    /// padding
    pub padding: [u64; 15],
}
impl CollateralVault {
    pub const LEN: usize = 8 + 32 + 32 + 8*15;
}


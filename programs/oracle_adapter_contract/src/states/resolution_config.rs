use anchor_lang::prelude::*;

#[account]
pub struct ResolutionConfig {
    pub market_config: Pubkey,
    pub resolution_config_bump: u8,
    pub resolution_config_created_at: i64,
    pub resolution_config_expiration: i64,
}

impl ResolutionConfig {
    pub const LEN: usize = 8 + 32 + 1 + 8 + 8;
}
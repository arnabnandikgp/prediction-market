use anchor_lang::prelude::*;

pub const COLLATERAL_VAULT_SEED: &str = "collateral_vault";

/// Holds the current owner of the factory
#[account]
#[derive(Default, Debug)]
#[derive(InitSpace)]
pub struct VaultState {
    pub market_config: Pubkey,
    pub vault_creator: Pubkey,

    pub vault_created_at: i64,
    pub vault_expiration: i64,
    



}
impl VaultState {

    
}


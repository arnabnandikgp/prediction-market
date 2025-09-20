use anchor_lang::prelude::*;

pub const COLLATERAL_VAULT_SEED: &str = "collateral_vault";

/// Holds the current owner of the factory
/// the contract will have to create and own a pda that will act as the vault for the collateral
/// with the following seeds:
///         seeds = [
// b"vault_account",
// market_config.key().as_ref(),
// collateral_mint.key().as_ref(),
// ],
// bump,
#[account]
#[derive(Default, Debug, InitSpace)]
pub struct VaultState {
    // the market config
    pub market_config: Pubkey,

    // the vault creator
    pub vault_creator: Pubkey,

    // the vaults creation and expiration dates
    pub vault_created_at: i64,
    pub vault_expiration: i64,

    // the mints of the conditional tokens
    pub ctf1_mint: Pubkey,
    pub ctf2_mint: Pubkey,

    // the token programs of the conditional tokens
    pub ctf1_token_program: Pubkey,
    pub ctf2_token_program: Pubkey,

    // did the market resolve or not
    pub resolution: u8,

    // winning conditional token mint
    pub winning_ctf_mint: Pubkey,
}
impl VaultState {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 32 + 32 + 32 + 32;

    pub fn initialize(
        &mut self,
        market_config: Pubkey,
        vault_creator: Pubkey,
        vault_created_at: i64,
        vault_expiration: i64,
        ctf1_mint: Pubkey,
        ctf2_mint: Pubkey,
        ctf1_token_program: Pubkey,
        ctf2_token_program: Pubkey,
    ) -> Result<()> {
        self.market_config = market_config;
        self.vault_creator = vault_creator;
        self.vault_created_at = vault_created_at;
        self.vault_expiration = vault_expiration;
        self.ctf1_mint = ctf1_mint;
        self.ctf2_mint = ctf2_mint;
        self.ctf1_token_program = ctf1_token_program;
        self.ctf2_token_program = ctf2_token_program;
        self.resolution = 0;
        Ok(())
    }

    pub fn resolve_market(&mut self, winning_ctf_mint: Pubkey) -> Result<()> {
        self.resolution = 1;
        self.winning_ctf_mint = winning_ctf_mint;
        Ok(())
    }


}

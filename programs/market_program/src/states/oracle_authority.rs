use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct OracleAuthority {
  pub bump: u8,
  pub resolution_price: i64,
  pub target_price: i64,
}
use anchor_lang::prelude::*;

pub mod instructions;
pub mod utils;
pub mod states;
pub mod error;

pub use states::*;
pub use instructions::*;
pub use utils::*;
pub use error::*;

declare_id!("9iCxo1nJnDCtZTyKqFKc5PCFmfiezNnXCnycCrYq1GVL");

#[program]
pub mod market_program {
    use super::*;
    pub fn create_market_config(ctx: Context<CreateMarketConfig>, index: u16, name: String, description: String, expiration: i64) -> Result<()> {
        instructions::create_market_config(ctx, index, name, description, expiration)
    }

    pub fn create_permissioned_pda(ctx: Context<CreatePermissionPda>) -> Result<()> {
        instructions::create_permission_pda(ctx)
    }

    pub fn close_permissioned_pda(ctx: Context<ClosePermissionPda>) -> Result<()> {
        instructions::close_permission_pda(ctx)
    }

    pub fn update_market_config(ctx: Context<UpdateMarketConfig>, param: u8, value: u64) -> Result<()> {
        instructions::update_market_config(ctx, param, value)
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn buy_bet(ctx: Context<BuyBet>, bet_amount: u64) -> Result<()> {
        instructions::buy_bet(ctx, bet_amount)
    }

    pub fn sell_bet(ctx: Context<SellBet>, bet_amount: u64) -> Result<()> {
        instructions::sell_bet(ctx, bet_amount)
    }

    pub fn get_reward(ctx: Context<GetReward>, reward_amount: u64) -> Result<()> {
        instructions::get_reward(ctx, reward_amount)
    }

}


use anchor_lang::prelude::*;

pub mod instructions;
pub mod states;

pub use states::*;
pub use instructions::*;

declare_id!("9iCxo1nJnDCtZTyKqFKc5PCFmfiezNnXCnycCrYq1GVL");

#[program]
pub mod market_program {
    use super::*;


}


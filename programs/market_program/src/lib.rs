use anchor_lang::prelude::*;

declare_id!("9iCxo1nJnDCtZTyKqFKc5PCFmfiezNnXCnycCrYq1GVL");

#[program]
pub mod market_program {
    use super::*;

    pub fn initialize_funds(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

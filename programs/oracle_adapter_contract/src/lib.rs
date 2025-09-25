use anchor_lang::prelude::*;

pub mod instructions;
pub mod errors;
pub mod states;

pub use instructions::*;
pub use errors::*;
pub use states::*;

declare_id!("6QAq31696E4a8PKMgzVrTq1uBzvF87JNTeAQyHmGivEJ");

#[program]
pub mod oracle_adapter_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

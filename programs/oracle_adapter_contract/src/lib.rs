
// this contract will be triggered by a simple contract call from the client code.
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

pub use errors::*;
pub use instructions::*;
pub use states::*;


declare_id!("6QAq31696E4a8PKMgzVrTq1uBzvF87JNTeAQyHmGivEJ");
#[program]
pub mod oracle_adapter_contract {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }
    pub fn trigger(ctx: Context<Trigger>) -> Result<()> {
        instructions::trigger(ctx)
    }
}

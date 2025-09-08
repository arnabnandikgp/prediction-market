use anchor_lang::prelude::*;

declare_id!("CKGRJrwnWayKCAUzYvhF67eHkyD45uKFd8p8dYaXQ742");

#[program]
pub mod oracle_adapter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

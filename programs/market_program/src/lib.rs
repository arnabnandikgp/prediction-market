use anchor_lang::prelude::*;

pub mod instructions;
pub mod states;

pub use states::*;
pub use instructions::*;

declare_id!("9iCxo1nJnDCtZTyKqFKc5PCFmfiezNnXCnycCrYq1GVL");


#[program]
pub mod market_program {
    use super::*;




    // first create a permissioned pda
    pub fn create_permissioned_pda(ctx: Context<CreatePermissionPda>) -> Result<()> {
        instructions::create_permission_pda(ctx)
    }


    pub fn close_permissioned_pda(ctx: Context<ClosePermissionPda>) -> Result<()> {
        instructions::close_permission_pda(ctx)
    }



    // initialize with permission

    pub fn deposit_collateral(ctx: Context<DepositCollateral>) -> Result<()> {
        // merge_to_collateral(ctx)?;
        Ok(())
    }

}


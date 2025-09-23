use anchor_lang::{prelude::*};
use anchor_spl::{
    token_2022::{self},
};
use spl_token_2022::{
    self,
};

pub fn transfer_from_user_to_collateral_vault<'a>(
    authority: AccountInfo<'a>,
    from: AccountInfo<'a>,
    to_vault: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    mint_decimals: u8,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    token_2022::transfer_checked(
        CpiContext::new(
            token_program.to_account_info(),
            token_2022::TransferChecked {
                from,
                to: to_vault,
                authority,
                mint,
            },
        ),
        amount,
        mint_decimals,
    )
}

pub fn transfer_from_collateral_vault_to_user<'a>(
    authority: AccountInfo<'a>,
    from_vault: AccountInfo<'a>,
    to: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    mint_decimals: u8,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token_2022::TransferChecked {
                from: from_vault,
                to,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
        mint_decimals,
    )
}


/// Issue a spl_token `MintTo` instruction.
pub fn token_mint_to<'a>(
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    token_2022::mint_to(
        CpiContext::new_with_signer(
            token_program,
            token_2022::MintTo {
                to: destination,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
    )
}

pub fn token_burn<'a>(
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    from: AccountInfo<'a>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    token_2022::burn(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token_2022::Burn {
                from,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
    )
}
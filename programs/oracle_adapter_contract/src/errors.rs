/// Errors that may be returned by the TokenSwap program.
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Resolution config expired")]
    ResolutionConfigExpired,
    #[msg("Resolution config not found")]
    ResolutionConfigNotFound,
    #[msg("Resolution config already initialized")]
    ResolutionConfigAlreadyInitialized,
    #[msg("Resolution config not expired yet")]
    ResolutionConfigNotExpiredYet,
}

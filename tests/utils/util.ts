import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { MarketProgram } from "../../target/types/market_program";

export async function marketResolutionInstruction(
  program: Program<MarketProgram>,
  vaultState: PublicKey,
) {
  const accountInfo = await program.account.vaultState.fetch(vaultState);
  const resolution = accountInfo.resolution;
  const winnerCtMint = accountInfo.winningCtMint;

  if (resolution === 1) {
    return winnerCtMint;
  } else {
    return null;
  }

}
// to get the user ct amount 
export async function getUserCtAccountInfo(
  connection: Connection,
  user: PublicKey,
  ct1Mint: PublicKey,
  ct2Mint: PublicKey
) {
  const ct1Account = getAssociatedTokenAddressSync(
    ct1Mint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const ct2Account = getAssociatedTokenAddressSync(
    ct2Mint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Helper function to retry fetching account with VERY aggressive retry logic
  // Since we just created these accounts via buyBet, they MUST exist - RPC just needs time to sync
  const getAccountWithRetry = async (accountAddress: PublicKey) => {
    const maxRetries = 15;
    const baseDelay = 200; // Start with 200ms delay
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await getAccount(
          connection,
          accountAddress,
          'confirmed',
          TOKEN_2022_PROGRAM_ID
        );
      } catch (error: any) {
        // On last retry, throw with helpful error message
        if (i === maxRetries - 1) {
          console.error(`❌ Failed to fetch account after ${maxRetries} attempts`);
          console.error(`   Account address: ${accountAddress.toString()}`);
          console.error(`   Total wait time: ~${baseDelay * (Math.pow(2, 6) - 1) / 1000}s`);
          throw error;
        }
        
        // Exponential backoff with cap at 6400ms: 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms (capped)
        const delay = baseDelay * Math.pow(2, Math.min(i, 5));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable code');
  };

  const ct1AccountInfo = await getAccountWithRetry(ct1Account);
  const ct2AccountInfo = await getAccountWithRetry(ct2Account);

  const ct1Amount = ct1AccountInfo.amount;
  const ct2Amount = ct2AccountInfo.amount;

  return { ct1Amount, ct2Amount };

}

export function isEqual(amount1: bigint, amount2: bigint) {
  if (
    BigInt(amount1) === BigInt(amount2) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(1) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(-1)
  ) {
    return true;
  }
  return false;
}

/**
 * Enhanced error logging utility for Solana transactions
 * 
 * Usage in tests:
 * 
 * import { logTransactionError } from "./utils/error-logger";
 * 
 * try {
 *   await someTransaction();
 * } catch (error) {
 *   logTransactionError(error, "My Transaction Name");
 *   throw error;
 * }
 */

export function logTransactionError(error: any, transactionName?: string) {
  const name = transactionName || "Transaction";
  
  console.error(`\n${"=".repeat(80)}`);
  console.error(`❌ ${name} FAILED`);
  console.error(`${"=".repeat(80)}\n`);

  // Log error message
  if (error.message) {
    console.error("📝 Error Message:");
    console.error(error.message);
    console.error();
  }

  // Log transaction logs (most important!)
  if (error.logs && Array.isArray(error.logs)) {
    console.error("📋 Transaction Logs:");
    console.error("-".repeat(80));
    error.logs.forEach((log: string, index: number) => {
      // Highlight important logs
      if (log.includes("failed") || log.includes("error") || log.includes("Error")) {
        console.error(`  ${index}: ❌ ${log}`);
      } else if (log.includes("Program log:")) {
        console.error(`  ${index}: 💬 ${log}`);
      } else if (log.includes("invoke")) {
        console.error(`  ${index}: 🔄 ${log}`);
      } else if (log.includes("success")) {
        console.error(`  ${index}: ✅ ${log}`);
      } else {
        console.error(`  ${index}: ${log}`);
      }
    });
    console.error("-".repeat(80));
    console.error();
  }

  // Log error code if available
  if (error.code) {
    console.error(`🔢 Error Code: ${error.code}`);
    console.error();
  }

  // Log program error if available (Anchor errors)
  if (error.error) {
    console.error("⚠️  Program Error:");
    if (error.error.errorCode) {
      console.error(`  Code: ${error.error.errorCode.code}`);
      console.error(`  Number: ${error.error.errorCode.number}`);
    }
    if (error.error.errorMessage) {
      console.error(`  Message: ${error.error.errorMessage}`);
    }
    console.error();
  }

  // Log simulation logs if available
  if (error.simulationLogs && Array.isArray(error.simulationLogs)) {
    console.error("🔬 Simulation Logs:");
    console.error("-".repeat(80));
    error.simulationLogs.forEach((log: string, index: number) => {
      console.error(`  ${index}: ${log}`);
    });
    console.error("-".repeat(80));
    console.error();
  }

  // Parse and highlight common Solana errors
  if (error.message) {
    if (error.message.includes("Cross-program invocation")) {
      console.error("💡 Common Cause:");
      console.error("   - An account needs #[account(mut)] attribute");
      console.error("   - A PDA needs correct signer seeds");
      console.error("   - An account's writable/signer privileges are incorrect");
      console.error();
    } else if (error.message.includes("Could not create program address")) {
      console.error("💡 Common Cause:");
      console.error("   - PDA signer seeds don't match the account derivation");
      console.error("   - The bump seed is incorrect or not stored properly");
      console.error("   - Authority PDA derivation mismatch");
      console.error();
    } else if (error.message.includes("insufficient")) {
      console.error("💡 Common Cause:");
      console.error("   - Insufficient funds in the account");
      console.error("   - Not enough tokens for the operation");
      console.error();
    } else if (error.message.includes("ConstraintSeeds")) {
      console.error("💡 Common Cause:");
      console.error("   - PDA account seeds don't match expected derivation");
      console.error("   - Wrong seeds used in #[account(seeds = [...])] constraint");
      console.error();
    }
  }

  console.error(`${"=".repeat(80)}\n`);
}

/**
 * Get detailed account information for debugging
 */
export function logAccountInfo(accountName: string, publicKey: any, additionalInfo?: Record<string, any>) {
  console.log(`\n📍 Account: ${accountName}`);
  console.log(`   Address: ${publicKey.toString()}`);
  if (additionalInfo) {
    Object.entries(additionalInfo).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
  console.log();
}

/**
 * Log PDA derivation for debugging
 */
export function logPdaDerivation(
  name: string,
  seeds: (Buffer | Uint8Array)[],
  programId: any,
  derivedAddress: any,
  bump?: number
) {
  console.log(`\n🔑 PDA Derivation: ${name}`);
  console.log(`   Seeds:`);
  seeds.forEach((seed, i) => {
    const seedStr = Buffer.from(seed).toString("hex");
    console.log(`     [${i}]: ${seedStr.substring(0, 40)}${seedStr.length > 40 ? "..." : ""}`);
  });
  console.log(`   Program ID: ${programId.toString()}`);
  console.log(`   Derived Address: ${derivedAddress.toString()}`);
  if (bump !== undefined) {
    console.log(`   Bump: ${bump}`);
  }
  console.log();
}

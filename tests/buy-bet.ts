import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  ensureWalletFunded,
  setupInitializedMarket,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAta,
  mintToAta,
  getTokenAmount,
  program,
  provider,
} from "./helpers";

describe("buy-bet instruction", () => {
  before(async () => {
    await ensureWalletFunded();
  });

  it("fails to mint conditional tokens with current signer seeds", async () => {
    const { marketConfig, collateralMint, vaultState, vault, ct1Mint, ct2Mint, authority } =
      await setupInitializedMarket();

    const bettor = provider.wallet.publicKey;
    const collateralAccount = await getOrCreateAta(collateralMint, bettor);
    await mintToAta(collateralMint, collateralAccount.address, BigInt(1_000_000));

    const vaultBalanceBefore = await getTokenAmount(vault);
    const vaultStateBefore = await program.account.vaultState.fetch(vaultState);

    const ct1Account = getAssociatedTokenAddressSync(
      ct1Mint,
      bettor,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const ct2Account = getAssociatedTokenAddressSync(
      ct2Mint,
      bettor,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    try {
      await program.methods
        .buyBet(new anchor.BN(500_000))
        .accountsPartial({
          bettor,
          authority,
          collateralAccount: collateralAccount.address,
          ct1Mint,
          vaultState,
          vault,
          ct2Mint,
          ct1Account,
          ct2Account,
          collateralMint,
          collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("expected buyBet to fail because PDA signer seeds are inconsistent");
    } catch (err) {
      const message = (err as Error).message.toLowerCase();
      assert.ok(
        message.includes("invalid seeds") ||
          message.includes("signature verification failed") ||
          message.includes("custom program error"),
      );
    }

    const vaultBalanceAfter = await getTokenAmount(vault);
    assert.strictEqual(vaultBalanceAfter, vaultBalanceBefore);

    const vaultStateAfter = await program.account.vaultState.fetch(vaultState);
    assert.strictEqual(
      vaultStateAfter.vaultCollateralBalance.toString(),
      vaultStateBefore.vaultCollateralBalance.toString(),
    );

    const ct1Balance = await getTokenAmount(ct1Account);
    const ct2Balance = await getTokenAmount(ct2Account);
    assert.strictEqual(ct1Balance, 0n);
    assert.strictEqual(ct2Balance, 0n);
  });
});

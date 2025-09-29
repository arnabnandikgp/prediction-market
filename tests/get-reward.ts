import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import * as anchor from "@coral-xyz/anchor";
import {
  ensureWalletFunded,
  setupInitializedMarket,
  getOrCreateAta,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  program,
  provider,
} from "./helpers";

describe("get-reward instruction", () => {
  before(async () => {
    await ensureWalletFunded();
  });

  it("returns raw constraint failure before reward logic runs", async () => {
    const { collateralMint, vaultState, vault, ct1Mint, authority } = await setupInitializedMarket();

    const bettor = provider.wallet.publicKey;
    const collateralAccount = await getOrCreateAta(collateralMint, bettor);
    const ctAccount = await getOrCreateAta(ct1Mint, bettor);

    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    assert.strictEqual(vaultStateAccount.resolution, 0);

    try {
      await program.methods
        .getReward(new anchor.BN(100))
        .accountsPartial({
          bettor,
          authority,
          collateralAccount: collateralAccount.address,
          ctMint: ct1Mint,
          ctAccount: ctAccount.address,
          vaultState,
          vault,
          collateralMint,
          collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("expected getReward to fail until vault_state stores the vault address");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        assert.strictEqual(anchorError.error.errorCode.code, "ConstraintRaw");
      } else {
        assert.ok((err as Error).message.toLowerCase().includes("constraint"));
      }
    }

    const refreshedVaultState = await program.account.vaultState.fetch(vaultState);
    assert.strictEqual(refreshedVaultState.resolution, 0);
    assert.strictEqual(refreshedVaultState.vaultCollateralBalance.toNumber(), 0);
  });
});

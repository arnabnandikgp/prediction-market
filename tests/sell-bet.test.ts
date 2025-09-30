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
} from "./helpers.test";

describe("sell-bet instruction", () => {
  before(async () => {
    await ensureWalletFunded();
  });

  it("fails constraint because vault address isn't persisted", async () => {
    const { marketConfig, collateralMint, vaultState, vault, ct1Mint, ct2Mint, authority } =
      await setupInitializedMarket();

    const bettor = provider.wallet.publicKey;
    const collateralAccount = await getOrCreateAta(collateralMint, bettor);
    const ct1Account = await getOrCreateAta(ct1Mint, bettor);
    const ct2Account = await getOrCreateAta(ct2Mint, bettor);

    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    assert.ok(vaultStateAccount.vault.equals(anchor.web3.PublicKey.default));

    try {
      await program.methods
        .sellBet(new anchor.BN(100))
        .accountsPartial({
          bettor,
          authority,
          collateralAccount: collateralAccount.address,
          vaultState,
          vault,
          ct1Mint,
          ct2Mint,
          ct1Account: ct1Account.address,
          ct2Account: ct2Account.address,
          collateralMint,
          collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("expected sellBet to fail until vault is written into vault_state");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        assert.strictEqual(anchorError.error.errorCode.code, "ConstraintRaw");
      } else {
        assert.ok((err as Error).message.toLowerCase().includes("constraint"));
      }
    }

    const refreshedVaultState = await program.account.vaultState.fetch(vaultState);
    assert.ok(refreshedVaultState.vault.equals(anchor.web3.PublicKey.default));
    assert.strictEqual(refreshedVaultState.vaultCollateralBalance.toNumber(), 0);
    assert.ok(refreshedVaultState.marketConfig.equals(marketConfig));
  });
});

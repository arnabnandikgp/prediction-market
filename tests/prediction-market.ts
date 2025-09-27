import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { MarketProgram } from "../target/types/market_program";

describe("market-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.marketProgram as anchor.Program<MarketProgram>;

  const marketIndex = 7;
  const indexBuffer = Buffer.from(Uint8Array.of((marketIndex >> 8) & 0xff, marketIndex & 0xff));

  const seeds = [Buffer.from("amm_config"), indexBuffer];
  const [marketConfigPda, marketConfigBump] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId,
  );

  it("creates a new market config", async () => {
    const name = "GDP above 3%";
    const description = "Will GDP growth exceed 3% this quarter?";
    const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    const sig = await program.methods
      .createMarketConfig(marketIndex, name, description, expiration)
      .accountsPartial({
        signer: provider.wallet.publicKey,
        marketConfig: marketConfigPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    expect(sig).to.be.a("string");

    const marketConfig = await program.account.marketConfig.fetch(marketConfigPda);
    expect(marketConfig.bump).to.equal(marketConfigBump);
    expect(marketConfig.index).to.equal(marketIndex);
    expect(marketConfig.owner.equals(provider.wallet.publicKey)).to.be.true;
    expect(marketConfig.name).to.equal(name);
    expect(marketConfig.description).to.equal(description);
    expect(marketConfig.expiration.toNumber()).to.equal(expiration.toNumber());
    expect(marketConfig.createdAt.toNumber()).to.be.greaterThan(0);
    expect(marketConfig.marketResolution).to.be.false;
    expect(marketConfig.vault.equals(anchor.web3.PublicKey.default)).to.be.true;
  });

  it("rejects duplicate market config initialization", async () => {
    try {
      await program.methods
        .createMarketConfig(marketIndex, "Duplicate", "Duplicate description", new anchor.BN(0))
        .accountsPartial({
          signer: provider.wallet.publicKey,
          marketConfig: marketConfigPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected createMarketConfig to fail for an existing PDA");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        expect(anchorError.error.errorCode.code).to.equal("AccountAlreadyInitialized");
      } else {
        expect((err as Error).message).to.include("already in use");
      }
    }
  });

  it("enforces admin constraint on update", async () => {
    try {
      await program.methods
        .updateMarketConfig(0, new anchor.BN(123))
        .accountsPartial({ owner: provider.wallet.publicKey, marketConfig: marketConfigPda })
        .rpc();
      expect.fail("expected updateMarketConfig to fail when called by non-admin");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        expect(anchorError.error.errorCode.code).to.equal("ConstraintAddress");
      } else {
        expect((err as Error).message).to.include("constraint");
      }
    }
  });
});

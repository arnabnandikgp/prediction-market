import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { MarketProgram } from "../target/types/market_program";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.MarketProgram as anchor.Program<MarketProgram>;
const connection = provider.connection;

describe("Get Reward Tests", () => {
  before(async () => {
    const sig = await connection.requestAirdrop(
      provider.wallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 5
    );
    await connection.confirmTransaction(sig, "confirmed");
  });

  describe.skip("Get reward operations (to be implemented)", () => {
    it("should allow user to claim reward after market resolution", async () => {
      // TODO: Implement after market resolution logic is finalized
    });

    it("should fail when market is not resolved", async () => {
      // TODO: Implement
    });

    it("should fail when user has no winning tokens", async () => {
      // TODO: Implement
    });
  });
});

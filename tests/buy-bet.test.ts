import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { 
  createMint, 
  TOKEN_2022_PROGRAM_ID, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount
} from "@solana/spl-token";
import { MarketProgram } from "../target/types/market_program";
import { 
  setupBuyBetTest,
  buyBet,
  getVaultAddress,
  getct1MintAddress,
  getct2MintAddress,
  getUserCtAccountInfo,
  isEqual
} from "./utils";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.MarketProgram as anchor.Program<MarketProgram>;
const connection = provider.connection;
const walletKeypair = (provider.wallet as anchor.Wallet & { payer: anchor.web3.Keypair }).payer;

const nextIndex = (() => {
  let counter = Math.floor(Date.now() % 50000);
  return () => {
    counter = (counter + 1) % 65535;
    if (counter === 0) counter = 1;
    return counter;
  };
})();

describe("Buy Bet Tests", () => {
  let collateralMint: anchor.web3.PublicKey;

  before(async () => {
    const sig = await connection.requestAirdrop(
      provider.wallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 5
    );
    await connection.confirmTransaction(sig, "confirmed");

    collateralMint = await createMint(
      connection,
      walletKeypair,
      walletKeypair.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
  });

  describe("Test 2a: Buy bet operations and verify conditional tokens are credited", () => {
    it("should credit correct number of conditional tokens after single buy bet", async () => {
      const index = nextIndex();
      const name = `Test Market ${index}`;
      const description = `Test Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const config = {
        index,
        name,
        description,
        expiration
      };

      const { configAddress, vaultState, vaultStateAddress } = await setupBuyBetTest(
        program,
        connection,
        walletKeypair,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        config
      );

      const userCollateralAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        collateralMint,
        walletKeypair.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const mintAmount = BigInt(1_000_000_000);
      await mintTo(
        connection,
        walletKeypair,
        collateralMint,
        userCollateralAccount.address,
        walletKeypair,
        mintAmount,
        [],
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const [ct1MintAddress] = await getct1MintAddress(vaultStateAddress, program.programId);
      const [ct2MintAddress] = await getct2MintAddress(vaultStateAddress, program.programId);
      const [vaultAddress] = await getVaultAddress(vaultStateAddress, program.programId);

      const buyAmount = new anchor.BN(500_000_000);

      await buyBet(
        program,
        walletKeypair,
        buyAmount,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        vaultStateAddress,
        vaultAddress,
        ct1MintAddress,
        ct2MintAddress
      );

      const { ct1Amount, ct2Amount } = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );
      console.log("vmeow")
      console.log("buyAmount", buyAmount);
      console.log("ct1Amount", ct1Amount);
      console.log("ct2Amount", ct2Amount);

      expect(isEqual(ct1Amount, BigInt(buyAmount.toString()))).to.be.true;
      expect(isEqual(ct2Amount, BigInt(buyAmount.toString()))).to.be.true;

      const vaultStateAccount = await program.account.vaultState.fetch(vaultStateAddress);
      expect(isEqual(
        BigInt(vaultStateAccount.vaultCollateralBalance.toString()),
        BigInt(buyAmount.toString())
      )).to.be.true;

      const vaultAccountInfo = await getAccount(
        connection,
        vaultAddress,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      expect(isEqual(vaultAccountInfo.amount, BigInt(buyAmount.toString()))).to.be.true;
    });

    it("should correctly accumulate conditional tokens after multiple buy bet operations", async () => {
      const index = nextIndex();
      const name = `Test Market ${index}`;
      const description = `Test Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const config = {
        index,
        name,
        description,
        expiration
      };

      const { configAddress, vaultState, vaultStateAddress } = await setupBuyBetTest(
        program,
        connection,
        walletKeypair,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        config
      );

      const userCollateralAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        collateralMint,
        walletKeypair.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const mintAmount = BigInt(2_000_000_000);
      await mintTo(
        connection,
        walletKeypair,
        collateralMint,
        userCollateralAccount.address,
        walletKeypair,
        mintAmount,
        [],
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const [ct1MintAddress] = await getct1MintAddress(vaultStateAddress, program.programId);
      const [ct2MintAddress] = await getct2MintAddress(vaultStateAddress, program.programId);
      const [vaultAddress] = await getVaultAddress(vaultStateAddress, program.programId);

      const buyAmount1 = new anchor.BN(300_000_000);
      await buyBet(
        program,
        walletKeypair,
        buyAmount1,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        vaultStateAddress,
        vaultAddress,
        ct1MintAddress,
        ct2MintAddress
      );

      const afterFirstBuy = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );

      expect(isEqual(afterFirstBuy.ct1Amount, BigInt(buyAmount1.toString()))).to.be.true;
      expect(isEqual(afterFirstBuy.ct2Amount, BigInt(buyAmount1.toString()))).to.be.true;

      const buyAmount2 = new anchor.BN(200_000_000);
      await buyBet(
        program,
        walletKeypair,
        buyAmount2,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        vaultStateAddress,
        vaultAddress,
        ct1MintAddress,
        ct2MintAddress
      );

      const afterSecondBuy = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );

      const expectedTotal = BigInt(buyAmount1.add(buyAmount2).toString());
      expect(isEqual(afterSecondBuy.ct1Amount, expectedTotal)).to.be.true;
      expect(isEqual(afterSecondBuy.ct2Amount, expectedTotal)).to.be.true;

      const buyAmount3 = new anchor.BN(150_000_000);
      await buyBet(
        program,
        walletKeypair,
        buyAmount3,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        vaultStateAddress,
        vaultAddress,
        ct1MintAddress,
        ct2MintAddress
      );

      const afterThirdBuy = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );

      const expectedFinalTotal = BigInt(buyAmount1.add(buyAmount2).add(buyAmount3).toString());
      expect(isEqual(afterThirdBuy.ct1Amount, expectedFinalTotal)).to.be.true;
      expect(isEqual(afterThirdBuy.ct2Amount, expectedFinalTotal)).to.be.true;

      const vaultStateAccount = await program.account.vaultState.fetch(vaultStateAddress);
      expect(isEqual(
        BigInt(vaultStateAccount.vaultCollateralBalance.toString()),
        expectedFinalTotal
      )).to.be.true;
    });

    it("should fail when user has insufficient collateral", async () => {
      const index = nextIndex();
      const name = `Test Market ${index}`;
      const description = `Test Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const config = {
        index,
        name,
        description,
        expiration
      };

      const { configAddress, vaultState, vaultStateAddress } = await setupBuyBetTest(
        program,
        connection,
        walletKeypair,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        config
      );

      const userCollateralAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        collateralMint,
        walletKeypair.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const mintAmount = BigInt(100_000_000);
      await mintTo(
        connection,
        walletKeypair,
        collateralMint,
        userCollateralAccount.address,
        walletKeypair,
        mintAmount,
        [],
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const [ct1MintAddress] = await getct1MintAddress(vaultStateAddress, program.programId);
      const [ct2MintAddress] = await getct2MintAddress(vaultStateAddress, program.programId);
      const [vaultAddress] = await getVaultAddress(vaultStateAddress, program.programId);

      const tooMuchBuyAmount = new anchor.BN(200_000_000);

      try {
        await buyBet(
          program,
          walletKeypair,
          tooMuchBuyAmount,
          configAddress,
          collateralMint,
          TOKEN_2022_PROGRAM_ID,
          vaultStateAddress,
          vaultAddress,
          ct1MintAddress,
          ct2MintAddress
        );
        expect.fail("Should have failed with insufficient collateral");
      } catch (err) {
        expect(err).to.exist;
        const errorMessage = err.toString();
        expect(errorMessage).to.satisfy((msg: string) => 
          msg.includes("insufficient") || 
          msg.includes("Insufficient") || 
          msg.includes("0x1") ||
          msg.includes("custom program error")
        );
      }
    });
  });
});

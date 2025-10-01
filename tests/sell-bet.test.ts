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
  sellBet,
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

describe("Sell Bet Tests", () => {
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

  describe("Test 3a: User can sell a portion of conditional tokens", () => {
    it("should allow user to sell partial conditional tokens and receive collateral", async () => {
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

      const buyAmount = new anchor.BN(800_000_000);

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

      const beforeSell = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );
      expect(isEqual(beforeSell.ct1Amount, BigInt(buyAmount.toString()))).to.be.true;
      expect(isEqual(beforeSell.ct2Amount, BigInt(buyAmount.toString()))).to.be.true;

      const collateralBeforeSell = await getAccount(
        connection,
        userCollateralAccount.address,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const sellAmount = new anchor.BN(300_000_000);
      await sellBet(
        program,
        walletKeypair,
        sellAmount,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID,
        vaultStateAddress,
        vaultAddress,
        ct1MintAddress,
        ct2MintAddress
      );

      const afterSell = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );

      const expectedRemainingCt = BigInt(buyAmount.sub(sellAmount).toString());
      expect(isEqual(afterSell.ct1Amount, expectedRemainingCt)).to.be.true;
      expect(isEqual(afterSell.ct2Amount, expectedRemainingCt)).to.be.true;

      const collateralAfterSell = await getAccount(
        connection,
        userCollateralAccount.address,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const expectedCollateral = collateralBeforeSell.amount + BigInt(sellAmount.toString());
      expect(isEqual(collateralAfterSell.amount, expectedCollateral)).to.be.true;

      const vaultStateAccount = await program.account.vaultState.fetch(vaultStateAddress);
      expect(isEqual(
        BigInt(vaultStateAccount.vaultCollateralBalance.toString()),
        expectedRemainingCt
      )).to.be.true;
    });

    it("should allow user to sell all conditional tokens", async () => {
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

      const collateralBeforeSell = await getAccount(
        connection,
        userCollateralAccount.address,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      await sellBet(
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

      const afterSell = await getUserCtAccountInfo(
        connection,
        walletKeypair.publicKey,
        ct1MintAddress,
        ct2MintAddress
      );

      expect(afterSell.ct1Amount.toString()).to.equal("0");
      expect(afterSell.ct2Amount.toString()).to.equal("0");

      const collateralAfterSell = await getAccount(
        connection,
        userCollateralAccount.address,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const expectedCollateral = collateralBeforeSell.amount + BigInt(buyAmount.toString());
      expect(isEqual(collateralAfterSell.amount, expectedCollateral)).to.be.true;

      const vaultStateAccount = await program.account.vaultState.fetch(vaultStateAddress);
      expect(vaultStateAccount.vaultCollateralBalance.toString()).to.equal("0");
    });
  });

  describe("Test 3b: User cannot sell more conditional tokens than they have", () => {
    it("should fail when user tries to sell more CT than they own", async () => {
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

      const buyAmount = new anchor.BN(200_000_000);
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

      const tooMuchSellAmount = new anchor.BN(500_000_000);

      try {
        await sellBet(
          program,
          walletKeypair,
          tooMuchSellAmount,
          configAddress,
          collateralMint,
          TOKEN_2022_PROGRAM_ID,
          vaultStateAddress,
          vaultAddress,
          ct1MintAddress,
          ct2MintAddress
        );
        expect.fail("Should have failed when trying to sell more CT than owned");
      } catch (err) {
        expect(err).to.exist;
        const errorMessage = err.toString();
        expect(errorMessage).to.satisfy((msg: string) => 
          msg.includes("insufficient") || 
          msg.includes("Insufficient") || 
          msg.includes("0x1") ||
          msg.includes("custom program error") ||
          msg.includes("underflow")
        );
      }
    });

    it("should fail when user has no conditional tokens to sell", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      
      const airdropSig = await connection.requestAirdrop(
        unauthorizedUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 2
      );
      await connection.confirmTransaction(airdropSig, "confirmed");

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

      const unauthorizedUserCollateralAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        unauthorizedUser,
        collateralMint,
        unauthorizedUser.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        TOKEN_2022_PROGRAM_ID
      );

      const sellAmount = new anchor.BN(100_000_000);

      try {
        await sellBet(
          program,
          unauthorizedUser,
          sellAmount,
          configAddress,
          collateralMint,
          TOKEN_2022_PROGRAM_ID,
          vaultStateAddress,
          vaultAddress,
          ct1MintAddress,
          ct2MintAddress
        );
        expect.fail("Should have failed when user has no CT to sell");
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });
});

import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { createMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { MarketProgram } from "../target/types/market_program";
import { 
  setupInitializeMarketTest,
  createMarketConfig,
  initialize,
  getMarketConfigAddress,
  getAuthAddress,
  getVaultStateAddress,
  getVaultAddress,
  getct1MintAddress,
  getct2MintAddress
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

describe("Initialize Market Tests", () => {
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

  describe("Test 1a: Check if configured account data is configured properly", () => {
    it("should create market config with correct data", async () => {
      const index = nextIndex();
      const name = `Test Market ${index}`;
      const description = `Test Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const [marketConfigAddress] = await getMarketConfigAddress(index, program.programId);

      await createMarketConfig(
        program,
        connection,
        walletKeypair,
        index,
        name,
        description,
        expiration
      );

      const marketConfig = await program.account.marketConfig.fetch(marketConfigAddress);
      
      expect(marketConfig.index).to.equal(index);
      expect(marketConfig.owner.toString()).to.equal(walletKeypair.publicKey.toString());
      expect(marketConfig.name).to.equal(name);
      expect(marketConfig.description).to.equal(description);
      expect(marketConfig.expiration.toNumber()).to.equal(expiration.toNumber());
      expect(marketConfig.marketResolution).to.equal(false);
      expect(marketConfig.vaultState.toString()).to.equal(anchor.web3.PublicKey.default.toString());
      expect(marketConfig.vault.toString()).to.equal(anchor.web3.PublicKey.default.toString());
    });

    it("should initialize market and verify all account data is configured properly", async () => {
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

      const { configAddress } = await setupInitializeMarketTest(
        program,
        connection,
        walletKeypair,
        config
      );

      const { vaultState, vaultStateAddress } = await initialize(
        program,
        walletKeypair,
        configAddress,
        collateralMint,
        TOKEN_2022_PROGRAM_ID
      );


      const [expectedVaultStateAddress] = await getVaultStateAddress(
        configAddress,
        collateralMint,
        program.programId
      );

      const [expectedVaultAddress] = await getVaultAddress(
        vaultStateAddress,
        program.programId
      );
      const [expectedCt1MintAddress] = await getct1MintAddress(
        vaultStateAddress,
        program.programId
      );
      const [expectedCt2MintAddress] = await getct2MintAddress(
        vaultStateAddress,
        program.programId
      );

      expect(vaultStateAddress.toString()).to.equal(expectedVaultStateAddress.toString());
      const marketConfig = await program.account.marketConfig.fetch(configAddress);
      expect(marketConfig.vaultState.toString()).to.equal(vaultStateAddress.toString());
      expect(marketConfig.vault.toString()).to.equal(expectedVaultAddress.toString());
      expect(marketConfig.ct1Mint.toString()).to.equal(expectedCt1MintAddress.toString());
      expect(marketConfig.ct2Mint.toString()).to.equal(expectedCt2MintAddress.toString());
      expect(marketConfig.marketResolution).to.equal(false);

      const vaultStateAccount = await program.account.vaultState.fetch(vaultStateAddress);
      expect(vaultStateAccount.marketConfig.toString()).to.equal(configAddress.toString());
      expect(vaultStateAccount.vaultCreator.toString()).to.equal(walletKeypair.publicKey.toString());
      expect(vaultStateAccount.ctf1Mint.toString()).to.equal(expectedCt1MintAddress.toString());
      expect(vaultStateAccount.ctf2Mint.toString()).to.equal(expectedCt2MintAddress.toString());
      expect(vaultStateAccount.ctf1TokenProgram.toString()).to.equal(TOKEN_2022_PROGRAM_ID.toString());
      expect(vaultStateAccount.ctf2TokenProgram.toString()).to.equal(TOKEN_2022_PROGRAM_ID.toString());
      expect(vaultStateAccount.resolution).to.equal(0);
      expect(vaultStateAccount.vaultCollateralBalance.toNumber()).to.equal(0);
    });
  });

  describe("Test 1b: Check if things can be called without proper authority", () => {
    it("should fail when non-authority tries to initialize market", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      
      const airdropSig = await connection.requestAirdrop(
        unauthorizedUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig, "confirmed");

      const index = nextIndex();
      const name = `Unauthorized Market ${index}`;
      const description = `Unauthorized Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const configAddress = await createMarketConfig(
        program,
        connection,
        walletKeypair,
        index,
        name,
        description,
        expiration
      );

      const [authority] = await getAuthAddress(program.programId);
      const [vaultStateAddress] = await getVaultStateAddress(
        configAddress,
        collateralMint,
        program.programId
      );
      const [vaultAddress] = await getVaultAddress(
        vaultStateAddress,
        program.programId
      );
      const [ct1MintAddress] = await getct1MintAddress(
        vaultStateAddress,
        program.programId
      );
      const [ct2MintAddress] = await getct2MintAddress(
        vaultStateAddress,
        program.programId
      );

      try {
        await program.methods
          .initialize()
          .accountsPartial({
            creator: unauthorizedUser.publicKey,
            marketConfig: configAddress,
            authority: authority,
            ct1Mint: ct1MintAddress,
            ct2Mint: ct2MintAddress,
            ct1TokenProgram: TOKEN_2022_PROGRAM_ID,
            ct2TokenProgram: TOKEN_2022_PROGRAM_ID,
            vaultState: vaultStateAddress,
            vault: vaultAddress,
            collateralMint: collateralMint,
            collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();
        
        expect.fail("Should have failed with unauthorized user");
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it("should fail when trying to initialize with wrong vault state PDA", async () => {
      const index = nextIndex();
      const name = `Test Market ${index}`;
      const description = `Test Description ${index}`;
      const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

      const configAddress = await createMarketConfig(
        program,
        connection,
        walletKeypair,
        index,
        name,
        description,
        expiration
      );

      const [authority] = await getAuthAddress(program.programId);
      const wrongVaultState = anchor.web3.Keypair.generate().publicKey;
      const [vaultAddress] = await getVaultAddress(
        wrongVaultState,
        program.programId
      );
      const [ct1MintAddress] = await getct1MintAddress(
        wrongVaultState,
        program.programId
      );
      const [ct2MintAddress] = await getct2MintAddress(
        wrongVaultState,
        program.programId
      );

      try {
        await program.methods
          .initialize()
          .accountsPartial({
            creator: walletKeypair.publicKey,
            marketConfig: configAddress,
            authority: authority,
            ct1Mint: ct1MintAddress,
            ct2Mint: ct2MintAddress,
            ct1TokenProgram: TOKEN_2022_PROGRAM_ID,
            ct2TokenProgram: TOKEN_2022_PROGRAM_ID,
            vaultState: wrongVaultState,
            vault: vaultAddress,
            collateralMint: collateralMint,
            collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with wrong vault state PDA");
      } catch (err) {
        expect(err).to.exist;
        const errorMessage = err.toString();
        expect(errorMessage).to.satisfy((msg: string) => 
          msg.includes("Invalid") || msg.includes("invalid") || msg.includes("constraint")
        );
      }
    });
  });
});

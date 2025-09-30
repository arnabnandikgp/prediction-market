import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { createMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { MarketProgram } from "../target/types/market_program";

const AUTH_SEED = "vault_and_lp_mint_auth_seed";
const MARKET_CONFIG_SEED = "market_config";
const VAULT_STATE_SEED = "vault_state";
const VAULT_SEED = "vault";
const CT1_SEED = "conditional_token1";
const CT2_SEED = "conditional_token2";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.marketProgram as anchor.Program<MarketProgram>;
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

const indexToBuffer = (index: number) =>
  Buffer.from(Uint8Array.of((index >> 8) & 0xff, index & 0xff));

const deriveMarketConfigPda = (index: number) =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MARKET_CONFIG_SEED), indexToBuffer(index)],
    program.programId,
  );

const deriveInitializePdas = (
  marketConfig: anchor.web3.PublicKey,
  collateralMint: anchor.web3.PublicKey,
) => {
  const [vaultState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_STATE_SEED), marketConfig.toBuffer(), collateralMint.toBuffer()],
    program.programId,
  );
  const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), vaultState.toBuffer()],
    program.programId,
  );
  const [ct1Mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CT1_SEED), vaultState.toBuffer()],
    program.programId,
  );
  const [ct2Mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CT2_SEED), vaultState.toBuffer()],
    program.programId,
  );
  const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(AUTH_SEED)],
    program.programId,
  );
  return { vaultState, vault, ct1Mint, ct2Mint, authority };
};


async function createMarketConfigAccount(index: number) {
  const [marketConfig, bump] = deriveMarketConfigPda(index);
  const name = `Market-${index}`;
  const description = `Description-${index}`;
  const expiration = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
  await program.methods
    .createMarketConfig(index, name, description, expiration)
    .accountsPartial({
      signer: provider.wallet.publicKey,
      marketConfig,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  return { marketConfig, bump, name, description, expiration };
}

describe("market-program", () => {
  before(async () => {
    const sig = await connection.requestAirdrop(
      provider.wallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 5,
    );
    await connection.confirmTransaction(sig, "confirmed");
  });

  it("creates a new market config", async () => {
    const index = nextIndex();
    const { marketConfig, bump, name, description, expiration } = await createMarketConfigAccount(index);

    const account = await program.account.marketConfig.fetch(marketConfig);
    expect(account.bump).to.equal(bump);
    expect(account.index).to.equal(index);
    expect(account.owner.equals(provider.wallet.publicKey)).to.be.true;
    expect(account.name).to.equal(name);
    expect(account.description).to.equal(description);
    expect(account.expiration.toNumber()).to.equal(expiration.toNumber());
    expect(account.marketResolution).to.be.false;
    expect(account.vault.equals(anchor.web3.PublicKey.default)).to.be.true;
  });

  it("rejects duplicate market config initialization", async () => {
    const index = nextIndex();
    const { marketConfig } = await createMarketConfigAccount(index);
    try {
      await program.methods
        .createMarketConfig(index, "Duplicate", "Duplicate description", new anchor.BN(0))
        .accountsPartial({
          signer: provider.wallet.publicKey,
          marketConfig,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected duplicate initialization to fail");
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
    const index = nextIndex();
    const { marketConfig } = await createMarketConfigAccount(index);
    try {
      await program.methods
        .updateMarketConfig(0, new anchor.BN(123))
        .accountsPartial({ owner: provider.wallet.publicKey, marketConfig })
        .rpc();
      expect.fail("expected updateMarketConfig to reject non-admin");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        expect(anchorError.error.errorCode.code).to.equal("ConstraintAddress");
      } else {
        expect((err as Error).message).to.include("constraint");
      }
    }
  });

  it("initializes vault state and conditional mints", async () => {
    const index = nextIndex();
    const { marketConfig } = await createMarketConfigAccount(index);
    const collateralMint = await createMint(
      connection,
      walletKeypair,
      walletKeypair.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const { vaultState, vault, ct1Mint, ct2Mint, authority } = deriveInitializePdas(
      marketConfig,
      collateralMint,
    );
    //need to convert the types of vault to token account
    // need to convert the types of ct1mint and ct2mint to mint accounts

    const sig = await program.methods
      .initialize()
      .accountsPartial({
        creator: provider.wallet.publicKey,
        marketConfig,
        authority,
        ct1Mint,
        ct2Mint,
        ct1TokenProgram: TOKEN_2022_PROGRAM_ID,
        ct2TokenProgram: TOKEN_2022_PROGRAM_ID,
        vaultState,
        vault,
        collateralMint,
        collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    expect(sig).to.be.a("string");

    const configAccount = await program.account.marketConfig.fetch(marketConfig);
    expect(configAccount.vaultState.equals(vaultState)).to.be.true;
    expect(configAccount.vault.equals(vault)).to.be.true;
    expect(configAccount.ct1Mint.equals(ct1Mint)).to.be.true;
    expect(configAccount.ct2Mint.equals(ct2Mint)).to.be.true;
    expect(configAccount.marketResolution).to.be.false;

    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    expect(vaultStateAccount.marketConfig.equals(marketConfig)).to.be.true;
    expect(vaultStateAccount.vaultCreator.equals(provider.wallet.publicKey)).to.be.true;
    expect(vaultStateAccount.ctf1Mint.equals(ct1Mint)).to.be.true;
    expect(vaultStateAccount.ctf2Mint.equals(ct2Mint)).to.be.true;
    expect(vaultStateAccount.ctf1TokenProgram.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
    expect(vaultStateAccount.ctf2TokenProgram.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
    expect(vaultStateAccount.resolution).to.equal(0);

    const ct1Info = await connection.getAccountInfo(ct1Mint);
    const ct2Info = await connection.getAccountInfo(ct2Mint);
    const vaultInfo = await connection.getAccountInfo(vault);
    expect(ct1Info?.owner.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
    expect(ct2Info?.owner.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
    expect(vaultInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
  });

  it("rejects initialize when vault state PDA mismatches", async () => {
    const index = nextIndex();
    const { marketConfig } = await createMarketConfigAccount(index);
    const collateralMint = await createMint(
      connection,
      walletKeypair,
      walletKeypair.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const invalidVaultState = anchor.web3.Keypair.generate().publicKey;
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), invalidVaultState.toBuffer()],
      program.programId,
    );
    const [ct1Mint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CT1_SEED), invalidVaultState.toBuffer()],
      program.programId,
    );
    const [ct2Mint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CT2_SEED), invalidVaultState.toBuffer()],
      program.programId,
    );
    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(AUTH_SEED)],
      program.programId,
    );

    try {
      await program.methods
        .initialize()
        .accountsPartial({
          creator: provider.wallet.publicKey,
          marketConfig,
          authority,
          ct1Mint,
          ct2Mint,
          ct1TokenProgram: TOKEN_2022_PROGRAM_ID,
          ct2TokenProgram: TOKEN_2022_PROGRAM_ID,
          vaultState: invalidVaultState,
          vault,
          collateralMint,
          collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected initialize to fail with invalid vault_state PDA");
    } catch (err) {
      const anchorError = err as anchor.AnchorError;
      if (anchorError.error?.errorCode?.code) {
        expect(anchorError.error.errorCode.code).to.equal("InvalidPublicKey");
      } else {
        expect((err as Error).message).to.include("Invalid publickey");
      }
    }
  });
});

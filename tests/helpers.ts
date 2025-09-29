import * as anchor from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { LiteSVM } from "litesvm";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import marketProgramIdl from "../target/idl/market_program.json";
import { MarketProgram } from "../target/types/market_program";

export const AUTH_SEED = "vault_and_lp_mint_auth_seed";
export const MARKET_CONFIG_SEED = "amm_config";
export const VAULT_STATE_SEED = "vault_state";
export const VAULT_SEED = "vault";
export const CT1_SEED = "conditional_token1";
export const CT2_SEED = "conditional_token2";

const client = new LiteSVM();
client.withBuiltins();
client.withDefaultPrograms();
client.withSysvars();
const workspaceDir = process.cwd();
const marketProgramSo = path.join(workspaceDir, "target", "deploy", "market_program.so");
client.addProgramFromFile(new anchor.web3.PublicKey(marketProgramIdl.address), marketProgramSo);

const defaultWalletPath = process.env.ANCHOR_WALLET ?? path.join(os.homedir(), ".config", "solana", "id.json");
const secretKey = Uint8Array.from(JSON.parse(readFileSync(defaultWalletPath, "utf8")) as number[]);
const adminKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);
const adminWallet = new anchor.Wallet(adminKeypair);

export const provider = new LiteSVMProvider(client, adminWallet);
anchor.setProvider(provider);

export const program = new anchor.Program<MarketProgram>(
  marketProgramIdl as MarketProgram,
  provider,
);
export const connection = provider.connection;
export const walletKeypair = (provider.wallet as anchor.Wallet & {
  payer: anchor.web3.Keypair;
}).payer;

let walletFunded = false;
export async function ensureWalletFunded(
  lamports: bigint | number = BigInt(anchor.web3.LAMPORTS_PER_SOL) * 5n,
) {
  if (walletFunded) {
    return;
  }
  const amount = typeof lamports === "number" ? BigInt(lamports) : lamports;
  client.airdrop(provider.wallet.publicKey, amount);
  walletFunded = true;
}

export const nextIndex = (() => {
  let counter = Math.floor(Date.now() % 50000);
  return () => {
    counter = (counter + 1) % 65535;
    if (counter === 0) {
      counter = 1;
    }
    return counter;
  };
})();

const indexToBuffer = (index: number) =>
  Buffer.from(Uint8Array.of((index >> 8) & 0xff, index & 0xff));

export const deriveMarketConfigPda = (index: number) =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MARKET_CONFIG_SEED), indexToBuffer(index)],
    program.programId,
  );

export const deriveInitializePdas = (
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

export async function createMarketConfigAccount(index: number) {
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

export async function createToken2022Mint(decimals = 6) {
  const mint = anchor.web3.Keypair.generate();
  const rent = client.minimumBalanceForRentExemption(BigInt(MINT_SIZE));
  const tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: Number(rent),
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mint.publicKey,
      decimals,
      provider.wallet.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  await provider.sendAndConfirm?.(tx, [mint]);
  return mint.publicKey;
}

export async function setupInitializedMarket() {
  const index = nextIndex();
  const config = await createMarketConfigAccount(index);
  const collateralMint = await createToken2022Mint();
  const pdas = deriveInitializePdas(config.marketConfig, collateralMint);
  process.stderr.write(
    `setupInitializedMarket PDAs ${JSON.stringify({
      vault: pdas.vault.toBase58(),
      vaultState: pdas.vaultState.toBase58(),
      ct1Mint: pdas.ct1Mint.toBase58(),
      ct2Mint: pdas.ct2Mint.toBase58(),
    })}\n`,
  );

  await program.methods
    .initialize()
    .accountsPartial({
      creator: provider.wallet.publicKey,
      marketConfig: config.marketConfig,
      authority: pdas.authority,
      ct1Mint: pdas.ct1Mint,
      ct2Mint: pdas.ct2Mint,
      ct1TokenProgram: TOKEN_2022_PROGRAM_ID,
      ct2TokenProgram: TOKEN_2022_PROGRAM_ID,
      vaultState: pdas.vaultState,
      vault: pdas.vault,
      collateralMint,
      collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  return { index, collateralMint, ...config, ...pdas };
}

export async function getOrCreateAta(mint: anchor.web3.PublicKey, owner: anchor.web3.PublicKey) {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const existing = client.getAccount(ata);
  if (!existing) {
    const tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        ata,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
    await provider.sendAndConfirm?.(tx);
  }
  return { address: ata };
}

export async function mintToAta(
  mint: anchor.web3.PublicKey,
  destination: anchor.web3.PublicKey,
  amount: bigint,
) {
  const tx = new anchor.web3.Transaction().add(
    createMintToInstruction(
      mint,
      destination,
      provider.wallet.publicKey,
      amount,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  await provider.sendAndConfirm?.(tx);
}

export async function getTokenAmount(account: anchor.web3.PublicKey) {
  try {
    const tokenAccount = await getAccount(
      connection,
      account,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    return BigInt(tokenAccount.amount);
  } catch (_err) {
    return 0n;
  }
}

export {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
};

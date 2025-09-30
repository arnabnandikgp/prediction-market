import { Program, BN } from "@coral-xyz/anchor";
import { MarketProgram } from "../../target/types/market_program";
import {
  Connection,
  ConfirmOptions,
  PublicKey,
  Keypair,
  Signer,
  SystemProgram,
  ValidatorInfo,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  accountExist,
  sendTransaction,
  getMarketConfigAddress,
  getAuthAddress,
  getVaultStateAddress,
  getVaultAddress,
  getct1MintAddress,
  getct2MintAddress,
} from "./index";

import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

export async function setupInitializeMarketTest(
  program: Program<MarketProgram>,
  connection: Connection,
  owner: Signer,
  config: {
    index: number;
    name: string;
    description: string;
    expiration: BN;
  },
  confirmOptions?: ConfirmOptions
) {
  const configAddress = await createMarketConfig(
    program,
    connection,
    owner,
    config.index,
    config.name,
    config.description,
    config.expiration,
    confirmOptions
  );
  return {
    configAddress,
  };
}

export async function setupBuyBetTest(
  program: Program<MarketProgram>,
  connection: Connection,
  bettor: Signer,
  config: {
    index: number;
    name: string;
    description: string;
    expiration: BN;
  },
  confirmOptions?: ConfirmOptions,
) {
  const configAddress = await createMarketConfig(
    program,
    connection,
    bettor,
    config.index,
    config.name,
    config.description,
    config.expiration,
    confirmOptions
  );

  //only use the initialze method here
}

export async function setupSellBetTest(
  program: Program<MarketProgram>,
  connection: Connection,
  collateralMint: PublicKey,
  collateralTokenProgram: PublicKey,
  amount: BN,
  owner: Signer,
  config: {
    index: number;
    name: string;
    description: string;
    expiration: BN;
  },
  confirmOptions?: ConfirmOptions
) {
  const configAddress = await createMarketConfig(
    program,
    connection,
    owner,
    config.index,
    config.name,
    config.description,
    config.expiration,
    confirmOptions
  );

  const { vaultState, vaultStateAddress } = await initialize(
    program,
    owner,
    configAddress,
    collateralMint,
    collateralTokenProgram,
    confirmOptions
  );

  const [ct1MintAddress] = await getct1MintAddress(
    vaultStateAddress,
    program.programId
  );
  const [ct2MintAddress] = await getct2MintAddress(
    vaultStateAddress,
    program.programId
  );

  const [vaultAddress] = await getVaultAddress(
    vaultStateAddress,
    collateralMint,
    program.programId
  );

  await sellBet(
    program,
    owner,
    amount,
    configAddress,
    collateralMint,
    collateralTokenProgram,
    vaultStateAddress,
    vaultAddress,
    ct1MintAddress,
    ct2MintAddress,
    confirmOptions

  );
  return { configAddress, vaultState, vaultStateAddress };

}

export async function createMarketConfig(
  program: Program<MarketProgram>,
  connection: Connection,
  owner: Signer,
  index: number,
  name: string,
  description: string,
  expiration: BN,
  confirmOptions?: ConfirmOptions
): Promise<PublicKey> {
  const [address, _] = await getMarketConfigAddress(
    index,
    program.programId
  );
  if (await accountExist(connection, address)) {
    return address;
  }

  const ix = await program.methods
    .createMarketConfig(
      index,
      name,
      description,
      expiration
    )
    .accountsPartial({
        signer: owner.publicKey,
        marketConfig: address,
        systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = await sendTransaction(connection, [ix], [owner], confirmOptions);
  console.log("init amm config tx: ", tx);
  return address;
}

export async function initialize(
  program: Program<MarketProgram>,
  creator: Signer,
  configAddress: PublicKey,
  collateralMint: PublicKey,
  collateralTokenProgram: PublicKey,
  confirmOptions?: ConfirmOptions,
) {
  const [authority] = await getAuthAddress(program.programId);
  const [vaultStateAddress] = await getVaultStateAddress(
    configAddress,
    collateralMint,
    program.programId
  );
  const [vaultAddress] = await getVaultAddress(
    vaultStateAddress,
    collateralMint,
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
  await program.methods
    .initialize()
    .accountsPartial({
      creator: creator.publicKey,
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
      tokenProgram: collateralTokenProgram,
      systemProgram: SystemProgram.programId,
    })
    .rpc(confirmOptions);

  const vaultState = await program.account.vaultState.fetch(vaultStateAddress);
  return { vaultState, vaultStateAddress };
}

export async function buyBet(
  program: Program<MarketProgram>,
  owner: Signer,
  amount: BN,
  configAddress: PublicKey,
  collateralMint: PublicKey,
  collateralTokenProgram: PublicKey,
  vaultStateAddress: PublicKey,
  vaultAddress: PublicKey,
  ct1MintAddress: PublicKey,
  ct2MintAddress: PublicKey,
  confirmOptions?: ConfirmOptions
) {
  const [authority] = await getAuthAddress(program.programId);
  const ct1Account = getAssociatedTokenAddressSync(
    ct1MintAddress,
    owner.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const ct2Account = getAssociatedTokenAddressSync(
    ct2MintAddress,
    owner.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const collateralAccount = getAssociatedTokenAddressSync(
    collateralMint,
    owner.publicKey,
    false,
    collateralTokenProgram
  );

  const tx = await program.methods
    .buyBet(amount)
    .accountsPartial({
      bettor: owner.publicKey,
      authority,
      collateralAccount: collateralAccount,
      ct1Mint: ct1MintAddress,
      vaultState: vaultStateAddress,
      vault: vaultAddress,
      ct2Mint: ct2MintAddress,
      ct1Account,
      ct2Account,
      collateralMint: collateralMint,
      collateralTokenProgram: collateralTokenProgram,
      tokenProgram: collateralTokenProgram,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc(confirmOptions);
  return tx;
}

export async function sellBet(
  program: Program<MarketProgram>,
  owner: Signer,
  amount: BN,
  configAddress: PublicKey,
  collateralMint: PublicKey,
  collateralTokenProgram: PublicKey,
  vaultStateAddress: PublicKey,
  vaultAddress: PublicKey,
  ct1MintAddress: PublicKey,
  ct2MintAddress: PublicKey,
  confirmOptions?: ConfirmOptions
) {
  const [authority] = await getAuthAddress(program.programId);

  const collateralAccount = getAssociatedTokenAddressSync(
    collateralMint,
    owner.publicKey,
    false,
    collateralTokenProgram
  );

  const ct1Account = getAssociatedTokenAddressSync(
    ct1MintAddress,
    owner.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const ct2Account = getAssociatedTokenAddressSync(
    ct2MintAddress,
    owner.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await program.methods
    .sellBet(amount)
    .accountsPartial({
      bettor: owner.publicKey,
      authority,
      collateralAccount,
      vaultState: vaultStateAddress,
      vault: vaultAddress,
      ct1Mint: ct1MintAddress,
      ct2Mint: ct2MintAddress,
      ct1Account,
      ct2Account,
      collateralMint: collateralMint,
      collateralTokenProgram: collateralTokenProgram,
      tokenProgram: collateralTokenProgram,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc(confirmOptions);

  return tx;
}

export async function getReward(
  program: Program<MarketProgram>,
  owner: Signer,
  configAddress: PublicKey,
  amount: BN,
  confirmOptions?: ConfirmOptions
) {
  const [auth] = await getAuthAddress(program.programId);
  const tx = await program.methods
    .getReward(amount)
    .accounts({
      
    })
    .rpc(confirmOptions);

  return tx;
}

import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createMint,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ExtensionType,
  getMintLen,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMintInstruction,
  getAccount,
} from "@solana/spl-token";
import { sendTransaction } from "./index";



export async function createConditionalTokenMint(
  connection: Connection,
  payer: Signer,
  authority: PublicKey,
  tokenProgram: PublicKey
) {
  const ctf1_mint = await createMint(
    connection,
    payer,
    authority,
    null,
    9,
    undefined,
    undefined,
    tokenProgram
  );
}

export async function createTokenMintAndAssociatedTokenAccount(
  connection: Connection,
  payer: Signer,
  mintAuthority: Signer,
  transferFeeConfig: { transferFeeBasisPoints: number; MaxFee: number },
  allToken2022?: boolean
) {
  let ixs: TransactionInstruction[] = [];
  ixs.push(
    web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: mintAuthority.publicKey,
      lamports: web3.LAMPORTS_PER_SOL,
    })
  );
  await sendTransaction(connection, ixs, [payer]);

  interface Token {
    address: PublicKey;
    program: PublicKey;
  }

  let tokenArray: Token[] = [];
  if (allToken2022) {
    let token0 = await createMintWithTransferFee(
      connection,
      payer,
      mintAuthority,
      Keypair.generate(),
      transferFeeConfig
    );
    tokenArray.push({ address: token0, program: TOKEN_2022_PROGRAM_ID });
  } else {
    let token0 = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      9
    );
    tokenArray.push({ address: token0, program: TOKEN_PROGRAM_ID });
  }

  let token1 = await createMintWithTransferFee(
    connection,
    payer,
    mintAuthority,
    Keypair.generate(),
    transferFeeConfig
  );

  tokenArray.push({ address: token1, program: TOKEN_2022_PROGRAM_ID });

  tokenArray.sort(function (x, y) {
    const buffer1 = x.address.toBuffer();
    const buffer2 = y.address.toBuffer();

    for (let i = 0; i < buffer1.length && i < buffer2.length; i++) {
      if (buffer1[i] < buffer2[i]) {
        return -1;
      }
      if (buffer1[i] > buffer2[i]) {
        return 1;
      }
    }

    if (buffer1.length < buffer2.length) {
      return -1;
    }
    if (buffer1.length > buffer2.length) {
      return 1;
    }

    return 0;
  });

  let token0 = tokenArray[0].address;
  token1 = tokenArray[1].address;
  //   console.log("Token 0", token0.toString());
  //   console.log("Token 1", token1.toString());
  const token0Program = tokenArray[0].program;
  const token1Program = tokenArray[1].program;

  const ownerToken0Account = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    token0,
    payer.publicKey,
    false,
    "processed",
    { skipPreflight: true },
    token0Program
  );

  await mintTo(
    connection,
    payer,
    token0,
    ownerToken0Account.address,
    mintAuthority,
    BigInt("18446744073709551615000000000"),
    [],
    { skipPreflight: true },
    token0Program
  );

  // console.log(
  //   "ownerToken0Account key: ",
  //   ownerToken0Account.address.toString()
  // );

  const ownerToken1Account = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    token1,
    payer.publicKey,
    false,
    "processed",
    { skipPreflight: true },
    token1Program
  );
  // console.log(
  //   "ownerToken1Account key: ",
  //   ownerToken1Account.address.toString()
  // );
  await mintTo(
    connection,
    payer,
    token1,
    ownerToken1Account.address,
    mintAuthority,
    BigInt("18446744073709551615000000000"),
    [],
    { skipPreflight: true },
    token1Program
  );

  return [
    { token0, token0Program },
    { token1, token1Program },
  ];
}
// getuserctandvaultacmount
export async function getUserCtandVaultAcmount(
  owner: PublicKey,
  ct1Mint: PublicKey,
  ct2Mint: PublicKey,
  ct1Program: PublicKey,
  ct2Program: PublicKey,
  authority: PublicKey,
  vault: PublicKey
) {

  // logic to get the user ct and vault amount
}

export function isEqual(amount1: bigint, amount2: bigint) {
  if (
    BigInt(amount1) === BigInt(amount2) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(1) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(-1)
  ) {
    return true;
  }
  return false;
}

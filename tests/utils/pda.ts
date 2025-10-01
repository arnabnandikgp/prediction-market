import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
export const MARKET_CONFIG_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("market_config")
);
export const VAULT_STATE_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("vault_state"));
export const VAULT_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("vault")
);
export const AUTH_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("vault_and_lp_mint_auth_seed")
);
export const CONDITIONAL_TOKEN_1_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("conditional_token1")
);

export const CONDITIONAL_TOKEN_2_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("conditional_token2")
);


export function u16ToBytes(num: number) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

export function i16ToBytes(num: number) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setInt16(0, num, false);
  return new Uint8Array(arr);
}

export function u32ToBytes(num: number) {
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setUint32(0, num, false);
  return new Uint8Array(arr);
}

export function i32ToBytes(num: number) {
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setInt32(0, num, false);
  return new Uint8Array(arr);
}

export async function getMarketConfigAddress(
  index: number,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [MARKET_CONFIG_SEED, u16ToBytes(index)],
    programId
  );
  return [address, bump];
}

export async function getAuthAddress(
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [AUTH_SEED],
    programId
  );
  return [address, bump];
}


export async function getVaultStateAddress(
  marketConfig: PublicKey,
  collateralMint: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [
      VAULT_STATE_SEED,
      marketConfig.toBuffer(),
      collateralMint.toBuffer(),
    ],
    programId
  );
  return [address, bump];
}

export async function getVaultAddress(
  vaultState: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [VAULT_SEED, vaultState.toBuffer()],
    programId
  );
  return [address, bump];
}
export async function getct1MintAddress(
  vaultState: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [CONDITIONAL_TOKEN_1_SEED, vaultState.toBuffer()],
    programId
  );
  return [address, bump];
}

export async function getct2MintAddress(
  vaultState: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddress(
    [CONDITIONAL_TOKEN_2_SEED, vaultState.toBuffer()],
    programId
  );
  return [address, bump];
}

// export async function getOrcleAdapterPdaAccountAddress(
//   pool: PublicKey,
//   programId: PublicKey
// ): Promise<[PublicKey, number]> {
//   const [address, bump] = await PublicKey.findProgramAddress(
//     [ORACLE_SEED, pool.toBuffer()],
//     programId
//   );
//   return [address, bump];
// }

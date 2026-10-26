import { randomBytes, scrypt } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { ALPHABET, CODE_LENGTH } from "./code-format";

export { CODE_LENGTH, formatCode, normalizeCode } from "./code-format";

// scrypt cost: ~50 ms per derivation, fine for a serverless open.
const SCRYPT = { N: 2 ** 14, r: 8, p: 1, keylen: 32 };

/** A fresh random code, normalized (no dashes). */
export function generateCode(): string {
  // 256 is a multiple of 32, so `byte % 32` is uniform.
  return Array.from(randomBytes(CODE_LENGTH), (byte) => ALPHABET[byte % 32]).join("");
}

/** scrypt(code, salt) → ed25519 seed → the Kadó keypair. */
export function codeToKeypair(code: string, salt: string): Promise<Keypair> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (error, seed) => {
      if (error) reject(error);
      else resolve(Keypair.fromRawEd25519Seed(new Uint8Array(seed)));
    });
  });
}

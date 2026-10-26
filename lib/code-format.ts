// Browser-safe helpers (no node:crypto): used by both the UI and the server.

// Crockford base32: no I, L, O, U. 12 symbols x 5 bits = 60 bits.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 12;

/**
 * What a person typed → normalized code, or null if it can't be one.
 * Accepts lower case, spaces and dashes; maps O→0 and I/L→1 (Crockford).
 */
export function normalizeCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (code.length !== CODE_LENGTH) return null;
  for (const char of code) if (!ALPHABET.includes(char)) return null;
  return code;
}

/** `XXXXXXXXXXXX` → `XXXX-XXXX-XXXX`. */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)!.join("-");
}

const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

/** The receipt: the account page shows the balance (SPEC.md). */
export function accountUrl(account: string): string {
  return `${EXPLORER_URL}/account/${account}`;
}

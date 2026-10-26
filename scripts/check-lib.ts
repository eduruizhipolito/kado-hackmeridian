// Sanity checks for lib/ (issue #2). Run: npx tsx scripts/check-lib.ts
import assert from "node:assert/strict";
import { Keypair } from "@stellar/stellar-sdk";
import { codeToKeypair, formatCode, generateCode, normalizeCode } from "../lib/code";
import { getKadoState } from "../lib/kado-state";

// Opened in prior work (THESIS.md, tx d3e637…).
const OPENED_ACCOUNT = "GAWCMJ57NV4LBKYOUEHIRF6HCBPLRAMSE4EYFEOMIMMOMUH6GCC5IDIF";

async function main() {
  const code = generateCode();
  assert.equal(code.length, 12);
  assert.equal(normalizeCode(formatCode(code).toLowerCase()), code);
  assert.equal(normalizeCode("o1il-0000-abcd"), "01110000ABCD");
  assert.equal(normalizeCode("ABCD-EFGH-JKMU"), null, "U is not Crockford");
  assert.equal(normalizeCode("ABCD-EFGH"), null, "too short");
  console.log("code format ok:", formatCode(code));

  const a = await codeToKeypair(code, "test-salt");
  const b = await codeToKeypair(code, "test-salt");
  const c = await codeToKeypair(code, "other-salt");
  assert.equal(a.publicKey(), b.publicKey(), "same code + salt → same key");
  assert.notEqual(a.publicKey(), c.publicKey(), "salt changes the key");
  console.log("derivation ok:", a.publicKey());

  const none = { has: () => false };
  const fresh = Keypair.random().publicKey();
  assert.equal((await getKadoState(OPENED_ACCOUNT, none)).state, "opened");
  assert.deepEqual(await getKadoState(fresh, none), { state: "not_found" });
  assert.deepEqual(await getKadoState(fresh, { has: (k) => k === fresh }), { state: "expired" });
  console.log("state machine ok (opened / not_found / swept→expired) on testnet");
  // closed / expired-with-balance are checked against a real batch in #3.
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

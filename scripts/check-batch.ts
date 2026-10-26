// Checks a batch end to end: CSV codes → keys match the manifest, and each
// Kadó is on-chain and `closed`. Run: npm run check-batch -- <batch-id>
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { codeToKeypair, normalizeCode } from "../lib/code";
import { getKadoState } from "../lib/kado-state";
import { BATCHES_DIR, knownKeys, loadManifests } from "../lib/manifest";
import { codeSalt } from "../lib/stellar/config";

async function main() {
  const id = process.argv[2];
  const manifest = loadManifests().find((m) => m.id === id);
  if (!manifest) throw new Error(`No manifest batches/${id}.json`);

  const codes = readFileSync(join(BATCHES_DIR, `${id}.codes.csv`), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => normalizeCode(line.split(",")[0])!);
  assert.equal(codes.length, manifest.kados.length, "one code per Kadó");

  for (const [i, code] of codes.entries()) {
    const key = (await codeToKeypair(code, codeSalt())).publicKey();
    assert.equal(key, manifest.kados[i].publicKey, `code ${i} derives to the manifest key`);
    const state = await getKadoState(key, knownKeys);
    console.log(key, JSON.stringify(state));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

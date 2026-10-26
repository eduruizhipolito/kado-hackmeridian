import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { KnownKeys } from "./kado-state";

/** Public batch manifest, `batches/<id>.json`. No codes, no secrets. */
export type Manifest = {
  id: string;
  label: string;
  network: "testnet";
  createdAt: string; // ISO, after the last creation tx was accepted
  expiresAt: string; // ISO, the beforeAbsoluteTime of every Kadó
  amountXlm: string;
  usdPerXlm: number; // frozen at generation (SPEC.md)
  amountUsd: string;
  sponsor: string;
  kados: { publicKey: string }[];
  txHashes: string[];
};

export const BATCHES_DIR = join(process.cwd(), "batches");

let cache: Manifest[] | undefined;

export function loadManifests(): Manifest[] {
  cache ??= readdirSync(BATCHES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(BATCHES_DIR, name), "utf8")) as Manifest);
  return cache;
}

/** The batch a Kadó public key belongs to, if any. */
export function findBatch(publicKey: string): Manifest | undefined {
  return loadManifests().find((m) => m.kados.some((k) => k.publicKey === publicKey));
}

export const knownKeys: KnownKeys = { has: (publicKey) => findBatch(publicKey) !== undefined };

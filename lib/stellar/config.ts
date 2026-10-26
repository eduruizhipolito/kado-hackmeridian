import { Horizon, Keypair, Networks } from "@stellar/stellar-sdk";

// Env is read lazily so `next build` works without secrets.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

export const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

// Testnet only for the hackathon (SPEC.md).
export const NETWORK_PASSPHRASE = Networks.TESTNET;

let server: Horizon.Server | undefined;
export function horizon(): Horizon.Server {
  server ??= new Horizon.Server(HORIZON_URL);
  return server;
}

export function sponsorKeypair(): Keypair {
  return Keypair.fromSecret(required("SPONSOR_SECRET"));
}

/** Channel accounts: tx source and fee payer of each open (SPEC F2). */
export function channelKeypairs(): Keypair[] {
  return required("CHANNEL_SECRETS")
    .split(",")
    .map((secret) => secret.trim())
    .filter(Boolean)
    .map((secret) => Keypair.fromSecret(secret));
}

export function codeSalt(): string {
  return required("CODE_SALT");
}

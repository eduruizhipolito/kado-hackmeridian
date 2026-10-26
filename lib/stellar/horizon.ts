import { NetworkError, NotFoundError } from "@stellar/stellar-sdk";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 300;

// 429, 5xx or no response at all: worth another try. A 404 is an answer.
function isRetryable(error: unknown): boolean {
  if (error instanceof NotFoundError) return false;
  if (error instanceof NetworkError) {
    const status = error.response?.status;
    return status === undefined || status === 429 || status >= 500;
  }
  return error instanceof TypeError; // fetch network failure
}

/**
 * Retries a Horizon READ with exponential backoff and full jitter
 * (many attendees opening at once from one server IP). Never wrap a submit
 * in this: on a lost submit response, re-read state instead (SPEC.md).
 */
export async function withRetry<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error;
      const cap = BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, Math.random() * cap));
    }
  }
}

/** Runs a read and turns a 404 into `null`. */
export async function orNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await withRetry(read);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

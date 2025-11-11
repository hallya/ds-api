import config from "./config.ts";

/**
 * Retries an asynchronous function with exponential backoff and jitter.
 * @param fn - The asynchronous function to retry.
 * @param options - Retry options.
 * @param options.attempts - Number of retry attempts (default: from config).
 * @param options.delay - Base delay in milliseconds (default: from config).
 * @param options.shouldRetry - Function to determine if error should be retried.
 * @returns A promise that resolves to the result of the function call.
 * @throws The last error encountered if all retries are exhausted.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const attempts = options.attempts || config.retryAttempts;
  const baseDelay = options.delay || config.retryDelay;
  const shouldRetry = options.shouldRetry || isTransientError;

  let lastError: unknown;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts && shouldRetry(error)) {
        const delay = calculateDelay(attempt, baseDelay);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Determines if an error is transient and should be retried.
 * @param error - The error to check.
 * @returns True if the error is transient and should be retried.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const transientCodes = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED", "EPIPE"];
    const errorCode = (error as Error & { code?: string }).code;
    if (errorCode && transientCodes.includes(errorCode)) {
      return true;
    }
    if (error.message && (error.message.includes("timeout") || error.message.includes("network"))) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff with jitter.
 * @param attempt - The current attempt number (0-based).
 * @param baseDelay - The base delay in milliseconds.
 * @returns The calculated delay in milliseconds.
 */
function calculateDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Sleeps for the specified number of milliseconds.
 * @param ms - The number of milliseconds to sleep.
 * @returns A promise that resolves after the sleep duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


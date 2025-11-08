import config from './config.js';

/**
 * Retries an asynchronous function with exponential backoff and jitter.
 * @param {Function} fn - The asynchronous function to retry.
 * @param {Object} [options={}] - Retry options.
 * @param {number} [options.attempts] - Number of retry attempts (default: from config).
 * @param {number} [options.delay] - Base delay in milliseconds (default: from config).
 * @param {Function} [options.shouldRetry] - Function to determine if error should be retried.
 * @returns {Promise} A promise that resolves to the result of the function call.
 * @throws {Error} The last error encountered if all retries are exhausted.
 */
export async function retry(fn, options = {}) {
  const attempts = options.attempts || config.retryAttempts;
  const baseDelay = options.delay || config.retryDelay;
  const shouldRetry = options.shouldRetry || isTransientError;

  let lastError;
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
 * @param {Error} error - The error to check.
 * @returns {boolean} True if the error is transient and should be retried.
 */
function isTransientError(error) {
  const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE'];
  return transientCodes.includes(error.code) ||
         (error.message && (error.message.includes('timeout') || error.message.includes('network')));
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff with jitter.
 * @param {number} attempt - The current attempt number (0-based).
 * @param {number} baseDelay - The base delay in milliseconds.
 * @returns {number} The calculated delay in milliseconds.
 */
function calculateDelay(attempt, baseDelay) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the sleep duration.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
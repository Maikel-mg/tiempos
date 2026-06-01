export interface RetryOptions {
  /** Maximum number of attempts (including the first try). Default: 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds. Default: 1000 */
  baseDelay?: number;
  /** Backoff multiplier. Default: 2 */
  multiplier?: number;
  /** Optional callback invoked before each retry (except the first attempt) */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn - The async operation to retry.
 * @param options - Retry configuration.
 * @returns The result of the operation on success.
 * @throws The last error after all attempts are exhausted.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, multiplier = 2, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(multiplier, attempt - 1);
        onRetry?.(attempt, lastError);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

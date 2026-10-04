import mongoose from 'mongoose';

/**
 * Utility helper to sleep for a specified duration in milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a work callback within a managed MongoDB/Mongoose transaction.
 *
 * Handles:
 * 1. Mongoose session creation and guaranteed session cleanup in finally.
 * 2. Automatic transaction start and rollback on error.
 * 3. Bounded retry of the entire transaction on 'TransientTransactionError' (e.g. WriteConflict).
 * 4. Bounded retry of commit on 'UnknownTransactionCommitResult'.
 * 5. Exponential backoff with jitter between retries.
 * 6. Preserves and rethrows original errors when retries are exhausted or on non-transient errors.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} work - Async callback receiving the active session.
 * @param {Object} [options] - Configuration options.
 * @param {number} [options.maxRetries=5] - Maximum retry attempts for transient transaction errors.
 * @param {number} [options.maxCommitRetries=3] - Maximum retry attempts for indeterminate commit results.
 * @param {number} [options.initialDelayMs=50] - Initial delay before first retry in milliseconds.
 * @param {import('mongodb').TransactionOptions} [options.transactionOptions] - Optional MongoDB transaction options.
 * @returns {Promise<T>} The result returned by the work callback.
 */
export const withTransaction = async (work, options = {}) => {
  if (typeof work !== 'function') {
    throw new TypeError('withTransaction requires a work callback function as the first argument');
  }

  const {
    maxRetries = 5,
    maxCommitRetries = 3,
    initialDelayMs = 50,
    transactionOptions
  } = options;

  let attempt = 0;

  while (true) {
    attempt++;
    const session = await mongoose.startSession();

    try {
      session.startTransaction(transactionOptions);

      // Execute caller-provided work callback with active session
      const result = await work(session);

      // Attempt to commit the transaction, retrying on UnknownTransactionCommitResult
      let commitAttempt = 0;
      while (true) {
        commitAttempt++;
        try {
          await session.commitTransaction();
          return result;
        } catch (commitErr) {
          const isUnknownCommit =
            commitErr &&
            typeof commitErr.hasErrorLabel === 'function' &&
            commitErr.hasErrorLabel('UnknownTransactionCommitResult');

          if (isUnknownCommit && commitAttempt <= maxCommitRetries) {
            const backoff = initialDelayMs * Math.pow(2, commitAttempt - 1) + Math.random() * 25;
            await delay(backoff);
            continue;
          }

          // If commit failed with a TransientTransactionError or commit retries exhausted,
          // throw so the outer catch can decide whether to retry the entire transaction.
          throw commitErr;
        }
      }
    } catch (err) {
      // Safely abort if transaction is still active
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (abortErr) {
        // Suppress abort errors (e.g., if connection was dropped or already aborted by server)
      }

      const isTransient =
        err &&
        typeof err.hasErrorLabel === 'function' &&
        err.hasErrorLabel('TransientTransactionError');

      if (isTransient && attempt <= maxRetries) {
        const backoff = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 25;
        await delay(backoff);
        continue;
      }

      // Non-transient error or retries exhausted: rethrow original error
      throw err;
    } finally {
      await session.endSession();
    }
  }
};

export default withTransaction;

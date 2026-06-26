"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, options = {}) {
    const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxAttempts) {
                break;
            }
            const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
            await sleep(delay);
        }
    }
    throw lastError !== null && lastError !== void 0 ? lastError : new Error('Retry failed');
}

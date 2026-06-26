"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const retry_1 = require("./retry");
(0, vitest_1.describe)('withRetry', () => {
    (0, vitest_1.it)('returns immediately on success', async () => {
        const result = await (0, retry_1.withRetry)(async () => 'ok');
        (0, vitest_1.expect)(result).toBe('ok');
    });
    (0, vitest_1.it)('retries until success', async () => {
        let attempts = 0;
        const result = await (0, retry_1.withRetry)(async () => {
            attempts += 1;
            if (attempts < 3)
                throw new Error('fail');
            return 'ok';
        }, { baseDelayMs: 10 });
        (0, vitest_1.expect)(result).toBe('ok');
        (0, vitest_1.expect)(attempts).toBe(3);
    });
    (0, vitest_1.it)('throws after max attempts', async () => {
        await (0, vitest_1.expect)((0, retry_1.withRetry)(async () => {
            throw new Error('always fails');
        }, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow('always fails');
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const state_1 = require("./state");
function createMockClient(response) {
    return {
        get: async () => response,
        post: async () => ({ status: 200, body: {} }),
    };
}
(0, vitest_1.describe)('fetchAgentState', () => {
    (0, vitest_1.it)('returns last_fec_id on success', async () => {
        const client = createMockClient({ status: 200, body: { last_fec_id: 42 } });
        const state = await (0, state_1.fetchAgentState)(client);
        (0, vitest_1.expect)(state.last_fec_id).toBe(42);
    });
    (0, vitest_1.it)('throws on non-200 status', async () => {
        const client = createMockClient({ status: 500, body: { error: 'boom' } });
        await (0, vitest_1.expect)((0, state_1.fetchAgentState)(client)).rejects.toThrow('Failed to fetch agent state');
    });
    (0, vitest_1.it)('throws if last_fec_id is missing', async () => {
        const client = createMockClient({ status: 200, body: {} });
        await (0, vitest_1.expect)((0, state_1.fetchAgentState)(client)).rejects.toThrow('Missing last_fec_id');
    });
});

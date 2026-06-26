"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAgentState = fetchAgentState;
async function fetchAgentState(client) {
    const response = await client.get('/api/agent/state');
    if (response.status !== 200) {
        throw new Error(`Failed to fetch agent state: HTTP ${response.status}`);
    }
    if (typeof response.body !== 'object' || response.body === null) {
        throw new Error('Invalid agent state response');
    }
    const body = response.body;
    if (typeof body.last_fec_id !== 'number') {
        throw new Error('Missing last_fec_id in agent state response');
    }
    return { last_fec_id: body.last_fec_id };
}

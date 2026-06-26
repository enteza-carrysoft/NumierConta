"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestClosures = ingestClosures;
exports.ingestTickets = ingestTickets;
exports.ingestExpenses = ingestExpenses;
exports.ingestMasters = ingestMasters;
const retry_1 = require("../sync/retry");
function ensureSuccess(response, endpoint) {
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Ingest failed for ${endpoint}: HTTP ${response.status}`);
    }
}
async function ingestClosures(client, closures) {
    var _a;
    const response = await (0, retry_1.withRetry)(() => client.post('/api/ingest/closures', { closures }));
    ensureSuccess(response, '/api/ingest/closures');
    return (_a = response.body) !== null && _a !== void 0 ? _a : { processed: closures.length };
}
async function ingestTickets(client, heads, lines) {
    var _a;
    const response = await (0, retry_1.withRetry)(() => client.post('/api/ingest/tickets', { heads, lines }));
    ensureSuccess(response, '/api/ingest/tickets');
    return (_a = response.body) !== null && _a !== void 0 ? _a : { processed: heads.length };
}
async function ingestExpenses(client, heads, lines) {
    var _a;
    const response = await (0, retry_1.withRetry)(() => client.post('/api/ingest/expenses', { heads, lines }));
    ensureSuccess(response, '/api/ingest/expenses');
    return (_a = response.body) !== null && _a !== void 0 ? _a : { processed: heads.length };
}
async function ingestMasters(client, customers, suppliers) {
    var _a;
    const response = await (0, retry_1.withRetry)(() => client.post('/api/ingest/masters', {
        customers,
        suppliers,
    }));
    ensureSuccess(response, '/api/ingest/masters');
    return (_a = response.body) !== null && _a !== void 0 ? _a : { processed: customers.length + suppliers.length };
}

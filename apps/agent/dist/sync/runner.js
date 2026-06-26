"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDependencies = createDependencies;
exports.runSync = runSync;
const client_1 = require("../api/client");
const state_1 = require("../api/state");
const ingest_1 = require("../api/ingest");
const connection_1 = require("../dbf/connection");
const closures_1 = require("../dbf/closures");
const tickets_1 = require("../dbf/tickets");
const expenses_1 = require("../dbf/expenses");
const masters_1 = require("../dbf/masters");
const state_2 = require("./state");
function toVfpDate(iso) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
function shouldSyncMasters(state, intervalSeconds) {
    if (!state.lastMasterSyncAt)
        return true;
    const last = new Date(state.lastMasterSyncAt).getTime();
    return Date.now() - last >= intervalSeconds * 1000;
}
function createDependencies(config) {
    return {
        httpClient: (0, client_1.createHttpClient)(config.apiBaseUrl, config.agentApiKey),
        dbf: (0, connection_1.createDbfConnection)(config.numierDataPath),
    };
}
async function runSync(config, logger, deps) {
    const allDeps = {
        ...createDependencies(config),
        ...deps,
    };
    const { httpClient, dbf } = allDeps;
    const syncState = (0, state_2.loadSyncState)(config.stateFilePath);
    logger.info('Iniciando ciclo de sincronización', {
        lastFecId: syncState.lastFecId,
    });
    const remoteState = await (0, state_1.fetchAgentState)(httpClient);
    logger.info('Estado remoto obtenido', { last_fec_id: remoteState.last_fec_id });
    const lastFecId = Math.max(syncState.lastFecId, remoteState.last_fec_id);
    const closures = await (0, closures_1.readClosures)(dbf, lastFecId);
    logger.info('Cierres leídos', { count: closures.length });
    const closureFecIds = closures.map((c) => c.numier_fec_id);
    const ticketHeads = await (0, tickets_1.readTicketHeads)(dbf, closureFecIds);
    const ticketIds = ticketHeads.map((h) => h.numier_ticket_id);
    const ticketLines = await (0, tickets_1.readTicketLines)(dbf, ticketIds);
    logger.info('Tickets leídos', { heads: ticketHeads.length, lines: ticketLines.length });
    let expenseHeads = [];
    let expenseLines = [];
    if (closures.length > 0) {
        const oldestClosure = closures.reduce((min, c) => c.numier_fec_id < min.numier_fec_id ? c : min);
        const fromDate = toVfpDate(oldestClosure.opened_at);
        expenseHeads = await (0, expenses_1.readExpenseHeads)(dbf, fromDate);
        const expenseIds = expenseHeads.map((h) => h.numier_expense_id);
        expenseLines = await (0, expenses_1.readExpenseLines)(dbf, expenseIds);
        logger.info('Gastos leídos', { heads: expenseHeads.length, lines: expenseLines.length });
    }
    let customers = [];
    let suppliers = [];
    if (shouldSyncMasters(syncState, config.masterSyncSeconds)) {
        customers = await (0, masters_1.readCustomers)(dbf);
        suppliers = await (0, masters_1.readSuppliers)(dbf);
        logger.info('Maestros leídos', { customers: customers.length, suppliers: suppliers.length });
    }
    if (closures.length > 0) {
        await (0, ingest_1.ingestClosures)(httpClient, closures);
    }
    if (ticketHeads.length > 0 || ticketLines.length > 0) {
        await (0, ingest_1.ingestTickets)(httpClient, ticketHeads, ticketLines);
    }
    if (expenseHeads.length > 0 || expenseLines.length > 0) {
        await (0, ingest_1.ingestExpenses)(httpClient, expenseHeads, expenseLines);
    }
    if (customers.length > 0 || suppliers.length > 0) {
        await (0, ingest_1.ingestMasters)(httpClient, customers, suppliers);
    }
    const newLastFecId = closures.length > 0
        ? Math.max(...closures.map((c) => c.numier_fec_id))
        : syncState.lastFecId;
    const newState = {
        lastFecId: newLastFecId,
        lastMasterSyncAt: customers.length > 0 || suppliers.length > 0
            ? new Date().toISOString()
            : syncState.lastMasterSyncAt,
    };
    (0, state_2.saveSyncState)(config.stateFilePath, newState);
    logger.info('Ciclo completado', { newLastFecId });
    return {
        closuresProcessed: closures.length,
        ticketsProcessed: ticketHeads.length,
        expensesProcessed: expenseHeads.length,
        mastersProcessed: customers.length + suppliers.length,
        newLastFecId,
    };
}

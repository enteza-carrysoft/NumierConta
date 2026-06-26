"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const runner_1 = require("./runner");
const logger_1 = require("../logger");
const connection_1 = require("../dbf/connection");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
function createMockHttpClient() {
    return {
        get: async () => ({ status: 200, body: { last_fec_id: 0 } }),
        post: async () => ({ status: 200, body: { processed: 1 } }),
    };
}
function createConfig(tmpDir) {
    return {
        numierDataPath: 'C:\\Numier\\Datos',
        apiBaseUrl: 'http://localhost:3000',
        agentApiKey: 'test_key',
        pollSeconds: 60,
        masterSyncSeconds: 3600,
        logLevel: 'error',
        stateFilePath: (0, path_1.join)(tmpDir, 'agent-state.json'),
    };
}
(0, vitest_1.describe)('runSync', () => {
    let tmpDir;
    let config;
    let logger;
    (0, vitest_1.beforeEach)(() => {
        tmpDir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), 'agent-test-'));
        config = createConfig(tmpDir);
        logger = new logger_1.Logger('error');
    });
    (0, vitest_1.afterEach)(() => {
        (0, fs_1.rmSync)(tmpDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('processes closures and advances last_fec_id', async () => {
        const dbf = (0, connection_1.createMockExecutor)({
            'from fechas': [
                {
                    FEC_ID: 5,
                    FEC_INICIO: new Date('2026-06-15T08:00:00Z'),
                    FEC_FIN: new Date('2026-06-15T23:00:00Z'),
                    TOTAL_VENTAS: 100,
                },
            ],
            'from cabecera': [],
            'from detalle': [],
            'from gastocab': [],
            'from gastodet': [],
            'from clientes': [],
            'from proveedo': [],
        });
        const result = await (0, runner_1.runSync)(config, logger, {
            httpClient: createMockHttpClient(),
            dbf,
        });
        (0, vitest_1.expect)(result.closuresProcessed).toBe(1);
        (0, vitest_1.expect)(result.newLastFecId).toBe(5);
    });
});

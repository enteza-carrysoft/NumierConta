"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const closures_1 = require("./closures");
const connection_1 = require("./connection");
(0, vitest_1.describe)('readClosures', () => {
    (0, vitest_1.it)('filters and maps DBF rows', async () => {
        const executor = (0, connection_1.createMockExecutor)({
            'from fechas': [
                {
                    FEC_ID: 10,
                    FEC_INICIO: new Date('2026-06-15T08:00:00Z'),
                    FEC_FIN: new Date('2026-06-15T23:00:00Z'),
                    TOTAL_VENTAS: 1250.5,
                    TOTAL_TARJETA: 800,
                    TOTAL_EFECTIVO: 450.5,
                },
            ],
        });
        const closures = await (0, closures_1.readClosures)(executor, 5);
        (0, vitest_1.expect)(closures).toHaveLength(1);
        (0, vitest_1.expect)(closures[0].numier_fec_id).toBe(10);
        (0, vitest_1.expect)(closures[0].total_sales).toBe(1250.5);
        (0, vitest_1.expect)(closures[0].total_payments).toEqual({
            tarjeta: 800,
            efectivo: 450.5,
        });
    });
    (0, vitest_1.it)('returns empty array when no rows match', async () => {
        const executor = (0, connection_1.createMockExecutor)({ 'from fechas': [] });
        const closures = await (0, closures_1.readClosures)(executor, 99);
        (0, vitest_1.expect)(closures).toHaveLength(0);
    });
});

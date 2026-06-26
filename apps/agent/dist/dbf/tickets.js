"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTicketHeads = readTicketHeads;
exports.readTicketLines = readTicketLines;
function toIsoString(value) {
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === 'string')
        return new Date(value).toISOString();
    return new Date().toISOString();
}
function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
async function readTicketHeads(executor, fecIds) {
    if (fecIds.length === 0)
        return [];
    const list = fecIds.join(',');
    const sql = `SELECT * FROM cabecera WHERE FEC_ID IN (${list}) ORDER BY TIC_ID`;
    const rows = await executor.query(sql);
    return rows.map((row) => ({
        numier_ticket_id: String(row.TIC_ID),
        closure_fec_id: Number(row.FEC_ID),
        issued_at: toIsoString(row.FECHA),
        total: toNumber(row.TOTAL),
        customer_ref: row.CLIENTE ? String(row.CLIENTE) : null,
        source_file: 'cabecera.dbf',
    }));
}
async function readTicketLines(executor, ticketIds) {
    if (ticketIds.length === 0)
        return [];
    const list = ticketIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
    const sql = `SELECT * FROM detalle WHERE TIC_ID IN (${list}) ORDER BY TIC_ID, LINEA`;
    const rows = await executor.query(sql);
    return rows.map((row) => {
        var _a;
        return ({
            numier_ticket_id: String(row.TIC_ID),
            line_number: Number(row.LINEA),
            item_ref: String(row.ART_ID),
            description: row.DESCRIPCION ? String(row.DESCRIPCION) : '',
            quantity: toNumber(row.CANTIDAD),
            unit_price: toNumber(row.PRECIO),
            line_amount: toNumber((_a = row.IMPORTE) !== null && _a !== void 0 ? _a : row.PRECIO),
            vat_rate: toNumber(row.IVA),
            source_file: 'detalle.dbf',
        });
    });
}

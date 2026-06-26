"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCustomers = readCustomers;
exports.readSuppliers = readSuppliers;
async function readCustomers(executor) {
    const sql = `SELECT * FROM clientes ORDER BY CODIGO`;
    const rows = await executor.query(sql);
    return rows.map((row) => ({
        code: String(row.CODIGO),
        name: String(row.NOMBRE),
        tax_id: row.CIF ? String(row.CIF) : null,
        address: row.DIRECCION ? String(row.DIRECCION) : null,
        source_file: 'clientes.dbf',
    }));
}
async function readSuppliers(executor) {
    const sql = `SELECT * FROM proveedo ORDER BY CODIGO`;
    const rows = await executor.query(sql);
    return rows.map((row) => ({
        code: String(row.CODIGO),
        name: String(row.NOMBRE),
        tax_id: row.CIF ? String(row.CIF) : null,
        address: row.DIRECCION ? String(row.DIRECCION) : null,
        source_file: 'proveedo.dbf',
    }));
}

import type { QueryExecutor } from './connection'
import type { DbfCustomerRow, DbfSupplierRow } from './types'
import type { RawMaster } from '../types'

export async function readCustomers(executor: QueryExecutor): Promise<RawMaster[]> {
  const sql = `SELECT * FROM clientes ORDER BY CODIGO`
  const rows = await executor.query<DbfCustomerRow[]>(sql)

  return rows.map((row) => ({
    code: String(row.CODIGO),
    name: String(row.NOMBRE),
    tax_id: row.CIF ? String(row.CIF) : null,
    address: row.DIRECCION ? String(row.DIRECCION) : null,
    source_file: 'clientes.dbf',
  }))
}

export async function readSuppliers(executor: QueryExecutor): Promise<RawMaster[]> {
  const sql = `SELECT * FROM proveedo ORDER BY CODIGO`
  const rows = await executor.query<DbfSupplierRow[]>(sql)

  return rows.map((row) => ({
    code: String(row.CODIGO),
    name: String(row.NOMBRE),
    tax_id: row.CIF ? String(row.CIF) : null,
    address: row.DIRECCION ? String(row.DIRECCION) : null,
    source_file: 'proveedo.dbf',
  }))
}

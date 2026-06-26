import type { QueryExecutor } from './connection'
import type { DbfExpenseHeadRow, DbfExpenseLineRow } from './types'
import type { RawExpenseHead, RawExpenseLine } from '../types'

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()
  return new Date().toISOString()
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1'
  return false
}

export async function readExpenseHeads(
  executor: QueryExecutor,
  fromDate: string
): Promise<RawExpenseHead[]> {
  const sql = `SELECT * FROM gastocab WHERE FECHA >= #${fromDate}# ORDER BY GAS_ID`
  const rows = await executor.query<DbfExpenseHeadRow[]>(sql)

  return rows.map((row) => ({
    numier_expense_id: String(row.GAS_ID),
    issued_at: toIsoString(row.FECHA),
    supplier_ref: row.PROVEEDOR ? String(row.PROVEEDOR) : null,
    description: row.CONCEPTO ? String(row.CONCEPTO) : null,
    total: toNumber(row.TOTAL),
    paid: toBoolean(row.PAGADO),
    source_file: 'gastocab.dbf',
  }))
}

export async function readExpenseLines(
  executor: QueryExecutor,
  expenseIds: string[]
): Promise<RawExpenseLine[]> {
  if (expenseIds.length === 0) return []
  const list = expenseIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
  const sql = `SELECT * FROM gastodet WHERE GAS_ID IN (${list}) ORDER BY GAS_ID, LINEA`
  const rows = await executor.query<DbfExpenseLineRow[]>(sql)

  return rows.map((row) => ({
    numier_expense_id: String(row.GAS_ID),
    line_number: Number(row.LINEA),
    description: row.CONCEPTO ? String(row.CONCEPTO) : '',
    amount: toNumber(row.IMPORTE),
    vat_rate: toNumber(row.IVA),
    source_file: 'gastodet.dbf',
  }))
}

import type { QueryExecutor } from './connection'
import type { DbfClosureRow } from './types'
import type { RawClosure } from '../types'

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

function extractPayments(row: DbfClosureRow): Record<string, number> {
  const payments: Record<string, number> = {}
  const knownFields = new Set([
    'FEC_ID',
    'FEC_INICIO',
    'FEC_FIN',
    'TOTAL_VENTAS',
  ])

  for (const key of Object.keys(row)) {
    if (knownFields.has(key)) continue
    if (typeof key !== 'string') continue
    const match = key.match(/^TOTAL_(.+)$/i)
    if (match) {
      const method = match[1].toLowerCase()
      payments[method] = toNumber(row[key])
    }
  }

  return payments
}

export async function readClosures(
  executor: QueryExecutor,
  lastFecId: number
): Promise<RawClosure[]> {
  const sql = `SELECT * FROM fechas WHERE FEC_ID > ${lastFecId} AND FEC_FIN IS NOT NULL ORDER BY FEC_ID`
  const rows = await executor.query<DbfClosureRow[]>(sql)

  return rows.map((row) => ({
    numier_fec_id: Number(row.FEC_ID),
    opened_at: toIsoString(row.FEC_INICIO),
    closed_at: row.FEC_FIN ? toIsoString(row.FEC_FIN) : toIsoString(row.FEC_INICIO),
    total_sales: toNumber(row.TOTAL_VENTAS),
    total_payments: extractPayments(row),
    source_file: 'fechas.dbf',
  }))
}

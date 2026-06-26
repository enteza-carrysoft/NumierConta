import type { QueryExecutor } from './connection'
import type { DbfTicketHeadRow, DbfTicketLineRow } from './types'
import type { RawTicketHead, RawTicketLine } from '../types'

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

export async function readTicketHeads(
  executor: QueryExecutor,
  fecIds: number[]
): Promise<RawTicketHead[]> {
  if (fecIds.length === 0) return []
  const list = fecIds.join(',')
  const sql = `SELECT * FROM cabecera WHERE FEC_ID IN (${list}) ORDER BY TIC_ID`
  const rows = await executor.query<DbfTicketHeadRow[]>(sql)

  return rows.map((row) => ({
    numier_ticket_id: String(row.TIC_ID),
    closure_fec_id: Number(row.FEC_ID),
    issued_at: toIsoString(row.FECHA),
    total: toNumber(row.TOTAL),
    customer_ref: row.CLIENTE ? String(row.CLIENTE) : null,
    source_file: 'cabecera.dbf',
  }))
}

export async function readTicketLines(
  executor: QueryExecutor,
  ticketIds: string[]
): Promise<RawTicketLine[]> {
  if (ticketIds.length === 0) return []
  const list = ticketIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
  const sql = `SELECT * FROM detalle WHERE TIC_ID IN (${list}) ORDER BY TIC_ID, LINEA`
  const rows = await executor.query<DbfTicketLineRow[]>(sql)

  return rows.map((row) => ({
    numier_ticket_id: String(row.TIC_ID),
    line_number: Number(row.LINEA),
    item_ref: String(row.ART_ID),
    description: row.DESCRIPCION ? String(row.DESCRIPCION) : '',
    quantity: toNumber(row.CANTIDAD),
    unit_price: toNumber(row.PRECIO),
    line_amount: toNumber(row.IMPORTE ?? row.PRECIO),
    vat_rate: toNumber(row.IVA),
    source_file: 'detalle.dbf',
  }))
}

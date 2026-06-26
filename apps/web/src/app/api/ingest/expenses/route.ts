import { IngestExpensesPayloadSchema } from '@numierconta/shared'
import { authenticateAgent } from '../../_lib/auth-agent'
import {
  badRequest,
  ingestResultResponse,
  internalError,
} from '../../_lib/respond'
import { upsertStagingRows, type UpsertResult } from '../../_lib/upsert'

function combineResults(results: UpsertResult[]): UpsertResult {
  return results.reduce(
    (acc, result) => ({
      inserted: acc.inserted + result.inserted,
      updated: acc.updated + result.updated,
      skipped: acc.skipped + result.skipped,
    }),
    { inserted: 0, updated: 0, skipped: 0 }
  )
}

export async function POST(request: Request) {
  const auth = await authenticateAgent(request)
  if (!auth.success) {
    return auth.response
  }

  const body = await request.json()
  const parsed = IngestExpensesPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.message)
  }

  const { heads, lines } = parsed.data

  try {
    const headRows = heads.map((head) => ({
      company_id: auth.companyId,
      numier_gac_id: head.numier_gac_id,
      expense_date: head.expense_date,
      supplier_id: head.supplier_id ?? null,
      total: head.total,
      from_cash: head.from_cash,
      invoice_ref: head.invoice_ref ?? null,
    }))

    const lineRows = lines.map((line) => ({
      company_id: auth.companyId,
      numier_gac_id: line.numier_gac_id,
      line_seq: line.line_seq,
      amount: line.amount,
      total: line.total,
      vat_rate: line.vat_rate,
    }))

    const [headResult, lineResult] = await Promise.all([
      upsertStagingRows('stg_expense_head', headRows, [
        'company_id',
        'numier_gac_id',
      ]),
      upsertStagingRows('stg_expense_lines', lineRows, [
        'company_id',
        'numier_gac_id',
        'line_seq',
      ]),
    ])

    return ingestResultResponse(combineResults([headResult, lineResult]))
  } catch (error) {
    console.error('Error ingesting expenses:', error)
    return internalError('Failed to ingest expenses')
  }
}

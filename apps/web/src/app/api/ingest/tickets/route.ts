import { IngestTicketsPayloadSchema } from '@numierconta/shared'
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
  const parsed = IngestTicketsPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.message)
  }

  const { heads, lines } = parsed.data

  try {
    const headRows = heads.map((head) => ({
      company_id: auth.companyId,
      numier_cab_id: head.numier_cab_id,
      ticket_date: head.ticket_date,
      ticket_time: head.ticket_time ?? null,
      operator_code: head.operator_code ?? null,
      state: head.state,
      payment_main: head.payment_main ?? null,
      amount_card: head.amount_card,
      amount_check: head.amount_check,
      invoice_number: head.invoice_number ?? null,
      customer_nif: head.customer_nif ?? null,
      doc_number: head.doc_number ?? null,
      numier_cli_id: head.numier_cli_id ?? null,
      total: head.total,
      closure_fec_id: head.closure_fec_id ?? null,
    }))

    const lineRows = lines.map((line) => ({
      company_id: auth.companyId,
      numier_cab_id: line.numier_cab_id,
      line_seq: line.line_seq,
      article_code: line.article_code ?? null,
      qty: line.qty,
      unit_price: line.unit_price,
      line_amount: line.line_amount,
      vat_rate: line.vat_rate,
      description: line.description ?? null,
    }))

    const [headResult, lineResult] = await Promise.all([
      upsertStagingRows('stg_ticket_head', headRows, [
        'company_id',
        'numier_cab_id',
      ]),
      upsertStagingRows('stg_ticket_lines', lineRows, [
        'company_id',
        'numier_cab_id',
        'line_seq',
      ]),
    ])

    return ingestResultResponse(combineResults([headResult, lineResult]))
  } catch (error) {
    console.error('Error ingesting tickets:', error)
    return internalError('Failed to ingest tickets')
  }
}

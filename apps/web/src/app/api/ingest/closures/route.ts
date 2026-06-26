import { NextResponse } from 'next/server'
import { IngestClosuresPayloadSchema } from '@numierconta/shared'
import { authenticateAgent } from '../../_lib/auth-agent'
import {
  badRequest,
  ingestResultResponse,
  internalError,
} from '../../_lib/respond'
import { upsertStagingRows } from '../../_lib/upsert'

export async function POST(request: Request) {
  const auth = await authenticateAgent(request)
  if (!auth.success) {
    return auth.response
  }

  const body = await request.json()
  const parsed = IngestClosuresPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.message)
  }

  const { closures } = parsed.data

  try {
    const rows = closures.map((closure) => ({
      company_id: auth.companyId,
      numier_fec_id: closure.numier_fec_id,
      opened_at: closure.opened_at ?? null,
      closed_at: closure.closed_at ?? null,
      total_cash: closure.total_cash ?? null,
      total_card: closure.total_card ?? null,
      total_sales: closure.total_sales ?? null,
      change_kept: closure.change_kept ?? null,
      withdrawals: closure.withdrawals ?? null,
    }))

    const result = await upsertStagingRows(
      'stg_closures',
      rows,
      ['company_id', 'numier_fec_id']
    )

    return ingestResultResponse(result)
  } catch (error) {
    console.error('Error ingesting closures:', error)
    return internalError('Failed to ingest closures')
  }
}

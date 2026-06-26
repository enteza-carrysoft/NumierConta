import { IngestMastersPayloadSchema } from '@numierconta/shared'
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
  const parsed = IngestMastersPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.message)
  }

  const { customers, suppliers } = parsed.data

  try {
    const customerRows = customers.map((customer) => ({
      company_id: auth.companyId,
      numier_cli_id: customer.numier_cli_id,
      nif: customer.nif ?? null,
      name: customer.name ?? null,
      address: customer.address ?? null,
      postal_code: customer.postal_code ?? null,
      city: customer.city ?? null,
      province: customer.province ?? null,
    }))

    const supplierRows = suppliers.map((supplier) => ({
      company_id: auth.companyId,
      numier_con_id: supplier.numier_con_id,
      nif: supplier.nif ?? null,
      name: supplier.name ?? null,
      address: supplier.address ?? null,
      postal_code: supplier.postal_code ?? null,
      city: supplier.city ?? null,
      province: supplier.province ?? null,
      category_id: supplier.category_id ?? null,
    }))

    const [customerResult, supplierResult] = await Promise.all([
      upsertStagingRows('stg_customers', customerRows, [
        'company_id',
        'numier_cli_id',
      ]),
      upsertStagingRows('stg_suppliers', supplierRows, [
        'company_id',
        'numier_con_id',
      ]),
    ])

    return ingestResultResponse(
      combineResults([customerResult, supplierResult])
    )
  } catch (error) {
    console.error('Error ingesting masters:', error)
    return internalError('Failed to ingest masters')
  }
}

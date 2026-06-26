import type { HttpClient } from './client'
import { withRetry } from '../sync/retry'
import type {
  RawClosure,
  RawTicketHead,
  RawTicketLine,
  RawExpenseHead,
  RawExpenseLine,
  RawMaster,
} from '../types'

export interface IngestResult {
  processed: number
}

function ensureSuccess(response: { status: number; body: unknown }, endpoint: string): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Ingest failed for ${endpoint}: HTTP ${response.status}`)
  }
}

export async function ingestClosures(
  client: HttpClient,
  closures: RawClosure[]
): Promise<IngestResult> {
  const response = await withRetry(() =>
    client.post<IngestResult>('/api/ingest/closures', { closures })
  )
  ensureSuccess(response, '/api/ingest/closures')
  return (response.body as IngestResult) ?? { processed: closures.length }
}

export async function ingestTickets(
  client: HttpClient,
  heads: RawTicketHead[],
  lines: RawTicketLine[]
): Promise<IngestResult> {
  const response = await withRetry(() =>
    client.post<IngestResult>('/api/ingest/tickets', { heads, lines })
  )
  ensureSuccess(response, '/api/ingest/tickets')
  return (response.body as IngestResult) ?? { processed: heads.length }
}

export async function ingestExpenses(
  client: HttpClient,
  heads: RawExpenseHead[],
  lines: RawExpenseLine[]
): Promise<IngestResult> {
  const response = await withRetry(() =>
    client.post<IngestResult>('/api/ingest/expenses', { heads, lines })
  )
  ensureSuccess(response, '/api/ingest/expenses')
  return (response.body as IngestResult) ?? { processed: heads.length }
}

export async function ingestMasters(
  client: HttpClient,
  customers: RawMaster[],
  suppliers: RawMaster[]
): Promise<IngestResult> {
  const response = await withRetry(() =>
    client.post<IngestResult>('/api/ingest/masters', {
      customers,
      suppliers,
    })
  )
  ensureSuccess(response, '/api/ingest/masters')
  return (response.body as IngestResult) ?? { processed: customers.length + suppliers.length }
}

import { createClient } from '@/lib/supabase/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export interface EntryLine {
  id: string
  lineSeq: number | null
  accountCode: string
  concept: string | null
  debit: number
  credit: number
}

export interface Entry {
  id: string
  entryNumber: number
  entryDate: string
  concept: string | null
  docNumber: string | null
  sourceType: string | null
  lines: EntryLine[]
}

export interface BatchDetail {
  id: string
  periodFrom: string | null
  periodTo: string | null
  status: string
  totalDebit: number
  totalCredit: number
  balanced: boolean | null
  createdAt: string
  entries: Entry[]
}

export async function getBatch(batchId: string): Promise<BatchDetail | null> {
  const company = await getCurrentCompany()
  if (!company) return null

  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select('id, period_from, period_to, status, total_debit, total_credit, balanced, created_at')
    .eq('id', batchId)
    .eq('company_id', company.companyId)
    .single()

  if (!batch) return null

  const { data: entries } = await supabase
    .from('entries')
    .select('id, entry_number, entry_date, concept, doc_number, source_type')
    .eq('batch_id', batchId)
    .eq('company_id', company.companyId)
    .order('entry_number', { ascending: true })

  const entryIds = (entries ?? []).map((e) => e.id)
  const { data: lines } = entryIds.length
    ? await supabase
        .from('entry_lines')
        .select('id, entry_id, line_seq, account_code, concept, debit, credit')
        .in('entry_id', entryIds)
        .eq('company_id', company.companyId)
        .order('line_seq', { ascending: true })
    : { data: [] }

  const linesByEntry = new Map<string, EntryLine[]>()
  for (const line of lines ?? []) {
    const list = linesByEntry.get(line.entry_id) ?? []
    list.push({
      id: line.id,
      lineSeq: line.line_seq,
      accountCode: line.account_code,
      concept: line.concept,
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0),
    })
    linesByEntry.set(line.entry_id, list)
  }

  return {
    id: batch.id,
    periodFrom: batch.period_from,
    periodTo: batch.period_to,
    status: batch.status,
    totalDebit: Number(batch.total_debit ?? 0),
    totalCredit: Number(batch.total_credit ?? 0),
    balanced: batch.balanced,
    createdAt: batch.created_at,
    entries: (entries ?? []).map((e) => ({
      id: e.id,
      entryNumber: e.entry_number,
      entryDate: e.entry_date,
      concept: e.concept,
      docNumber: e.doc_number,
      sourceType: e.source_type,
      lines: linesByEntry.get(e.id) ?? [],
    })),
  }
}

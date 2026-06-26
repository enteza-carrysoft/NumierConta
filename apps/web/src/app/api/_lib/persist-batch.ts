import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { EntryDraft } from '@numierconta/shared'

export interface PersistBatchInput {
  companyId: string
  userId: string
  periodFrom: string
  periodTo: string
  entries: EntryDraft[]
  processedClosureIds: number[]
  processedExpenseIds: number[]
}

export async function persistBatch(input: PersistBatchInput): Promise<string> {
  const {
    companyId,
    userId,
    periodFrom,
    periodTo,
    entries,
    processedClosureIds,
    processedExpenseIds,
  } = input

  const supabase = createServiceRoleClient()

  const totalDebit = entries.reduce(
    (sum, entry) => sum + entry.lines.reduce((s, line) => s + line.debit, 0),
    0
  )
  const totalCredit = entries.reduce(
    (sum, entry) => sum + entry.lines.reduce((s, line) => s + line.credit, 0),
    0
  )
  const balanced = entries.every((entry) => entry.balanced)

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .insert({
      company_id: companyId,
      period_from: periodFrom,
      period_to: periodTo,
      status: 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      balanced,
      created_by: userId,
    })
    .select('id')
    .single()

  if (batchError || !batch) {
    throw new Error(`Failed to create batch: ${batchError?.message}`)
  }

  const batchId = batch.id

  for (const entry of entries) {
    const { data: entryRow, error: entryError } = await supabase
      .from('entries')
      .insert({
        company_id: companyId,
        batch_id: batchId,
        entry_number: entry.entry_number ?? 0,
        entry_date: entry.entry_date,
        concept: entry.concept,
        doc_number: entry.doc_number ?? null,
        source_type: entry.source_type,
        source_ref: entry.source_ref,
        balanced: entry.balanced,
      })
      .select('id')
      .single()

    if (entryError || !entryRow) {
      throw new Error(`Failed to create entry: ${entryError?.message}`)
    }

    const entryId = entryRow.id
    const lineRows = entry.lines.map((line, index) => ({
      company_id: companyId,
      entry_id: entryId,
      line_seq: index + 1,
      account_code: line.account_code,
      concept: line.concept ?? entry.concept,
      debit: line.debit,
      credit: line.credit,
      vat_invoice_type: line.vat_invoice_type ?? null,
      is_rectification: line.is_rectification ?? false,
    }))

    if (lineRows.length > 0) {
      const { error: linesError } = await supabase
        .from('entry_lines')
        .insert(lineRows)

      if (linesError) {
        throw new Error(`Failed to create entry lines: ${linesError.message}`)
      }
    }
  }

  if (processedClosureIds.length > 0) {
    const { error: closureError } = await supabase
      .from('stg_closures')
      .update({ processed: true })
      .eq('company_id', companyId)
      .in('numier_fec_id', processedClosureIds)

    if (closureError) {
      throw new Error(`Failed to update closures: ${closureError.message}`)
    }
  }

  if (processedExpenseIds.length > 0) {
    const { error: expenseError } = await supabase
      .from('stg_expense_head')
      .update({ processed: true })
      .eq('company_id', companyId)
      .in('numier_gac_id', processedExpenseIds)

    if (expenseError) {
      throw new Error(`Failed to update expenses: ${expenseError.message}`)
    }
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    company_id: companyId,
    event: 'etl_run',
    detail: {
      batch_id: batchId,
      entries_count: entries.length,
      period_from: periodFrom,
      period_to: periodTo,
    },
  })

  if (auditError) {
    throw new Error(`Failed to create audit log: ${auditError.message}`)
  }

  return batchId
}

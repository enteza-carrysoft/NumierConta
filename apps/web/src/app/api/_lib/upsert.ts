import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type TableName = keyof Database['public']['Tables']

type RowInput<T extends TableName> = Database['public']['Tables'][T]['Insert']

export interface UpsertResult {
  inserted: number
  updated: number
  skipped: number
}

function createUntypedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function upsertStagingRows<T extends TableName>(
  table: T,
  rows: RowInput<T>[],
  conflictColumns: string[]
): Promise<UpsertResult> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 }
  }

  const supabase = createUntypedClient()
  const typedRows = rows as unknown as Record<string, unknown>[]
  const companyId = extractCompanyId(typedRows[0])
  const existingKeys = await fetchExistingKeys(table, companyId, conflictColumns, typedRows)

  const { error } = await supabase
    .from(table)
    .upsert(typedRows, {
      onConflict: conflictColumns.join(','),
      ignoreDuplicates: false,
    })

  if (error) {
    throw new Error(`Upsert failed on ${table}: ${error.message}`)
  }

  const inserted = rows.filter((row) => {
    const key = buildConflictKey(row as unknown as Record<string, unknown>, conflictColumns)
    return !existingKeys.includes(key)
  }).length

  return {
    inserted,
    updated: rows.length - inserted,
    skipped: 0,
  }
}

async function fetchExistingKeys<T extends TableName>(
  table: T,
  companyId: string,
  conflictColumns: string[],
  rows: Record<string, unknown>[]
): Promise<string[]> {
  const supabase = createUntypedClient()
  const selectColumns = conflictColumns.join(',')

  const { data, error } = await supabase
    .from(table)
    .select(selectColumns)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Fetch existing keys failed on ${table}: ${error.message}`)
  }

  const payloadKeys = new Set(
    rows.map((row) => buildConflictKey(row, conflictColumns))
  )

  return ((data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => buildConflictKey(row, conflictColumns))
    .filter((key) => payloadKeys.has(key))
}

function extractCompanyId(row: Record<string, unknown>): string {
  const companyId = row.company_id
  if (typeof companyId !== 'string') {
    throw new Error('Missing company_id in staging row')
  }
  return companyId
}

function buildConflictKey(
  row: Record<string, unknown>,
  columns: string[]
): string {
  return columns.map((column) => String(row[column])).join('|')
}

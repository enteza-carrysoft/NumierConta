'use server'

import { createClient } from '@/lib/supabase/server'
import type { MappingRule } from '@numierconta/shared/schemas/mapping-rule'

export async function listMappingRules(companyId: string): Promise<MappingRule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mapping_rules')
    .select('id, company_id, rule_type, match_key, debit_account, credit_account, vat_account, priority, active')
    .eq('company_id', companyId)
    .order('priority', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MappingRule[]
}

'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteMappingRule(companyId: string, ruleId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mapping_rules')
    .delete()
    .eq('id', ruleId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }
}

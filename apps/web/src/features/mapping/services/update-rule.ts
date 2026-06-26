'use server'

import { createClient } from '@/lib/supabase/server'
import { MappingRuleUpdateSchema } from '@numierconta/shared/schemas/mapping-rule'
import type { MappingRule, MappingRuleUpdateInput } from '@numierconta/shared/schemas/mapping-rule'

export async function updateMappingRule(
  companyId: string,
  ruleId: string,
  input: MappingRuleUpdateInput
): Promise<MappingRule> {
  const parsed = MappingRuleUpdateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mapping_rules')
    .update(parsed.data)
    .eq('id', ruleId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Error actualizando regla de mapeo')
  }

  return data as MappingRule
}

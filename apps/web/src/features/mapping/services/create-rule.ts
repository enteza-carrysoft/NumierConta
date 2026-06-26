'use server'

import { createClient } from '@/lib/supabase/server'
import { MappingRuleSchema } from '@numierconta/shared/schemas/mapping-rule'
import type { MappingRule, MappingRuleInput } from '@numierconta/shared/schemas/mapping-rule'

export async function createMappingRule(
  companyId: string,
  input: MappingRuleInput
): Promise<MappingRule> {
  const parsed = MappingRuleSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mapping_rules')
    .insert({
      company_id: companyId,
      ...parsed.data,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Error creando regla de mapeo')
  }

  return data as MappingRule
}

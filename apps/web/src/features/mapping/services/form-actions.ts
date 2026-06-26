'use server'

import { revalidatePath } from 'next/cache'
import { MappingRuleSchema } from '@numierconta/shared/schemas/mapping-rule'
import { createMappingRule } from './create-rule'
import { updateMappingRule } from './update-rule'
import { deleteMappingRule } from './delete-rule'

export interface MappingFormState {
  error?: string
  success?: boolean
}

function parseFormData(formData: FormData) {
  return {
    rule_type: formData.get('rule_type'),
    match_key: formData.get('match_key'),
    debit_account: formData.get('debit_account'),
    credit_account: formData.get('credit_account'),
    vat_account: formData.get('vat_account') || undefined,
    priority: formData.get('priority'),
    active: formData.get('active') === 'on',
  }
}

export async function createMappingRuleAction(
  _prevState: MappingFormState,
  formData: FormData
): Promise<MappingFormState> {
  const companyId = formData.get('company_id') as string
  if (!companyId) return { error: 'Empresa requerida' }

  const parsed = MappingRuleSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  try {
    await createMappingRule(companyId, parsed.data)
    revalidatePath('/mapping')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

export async function updateMappingRuleAction(
  _prevState: MappingFormState,
  formData: FormData
): Promise<MappingFormState> {
  const companyId = formData.get('company_id') as string
  const ruleId = formData.get('id') as string
  if (!companyId || !ruleId) return { error: 'Empresa y regla requeridas' }

  const parsed = MappingRuleSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  try {
    await updateMappingRule(companyId, ruleId, parsed.data)
    revalidatePath('/mapping')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

export async function deleteMappingRuleAction(formData: FormData): Promise<void> {
  const companyId = formData.get('company_id') as string
  const ruleId = formData.get('id') as string
  if (!companyId || !ruleId) return

  await deleteMappingRule(companyId, ruleId)
  revalidatePath('/mapping')
}

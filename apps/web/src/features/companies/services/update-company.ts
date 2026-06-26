'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { companySchema, type CompanyFormData } from '@/features/companies/schemas/company'

export interface UpdateCompanyState {
  error?: string
  success?: boolean
}

export async function updateCompany(
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const companyId = formData.get('id') as string
  if (!companyId) {
    return { error: 'ID de empresa requerido' }
  }

  const membership = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .single()

  if (!membership.data) {
    return { error: 'No tienes acceso a esta empresa' }
  }

  const raw = {
    name: formData.get('name'),
    cif: formData.get('cif') || undefined,
    classiccontaDigits: formData.get('classiccontaDigits'),
    fiscalYear: formData.get('fiscalYear') || undefined,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const { name, cif, classiccontaDigits, fiscalYear } = parsed.data

  const { error } = await supabase
    .from('companies')
    .update({
      name,
      cif,
      classicconta_digits: classiccontaDigits,
      fiscal_year: fiscalYear,
    })
    .eq('id', companyId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  return { success: true }
}

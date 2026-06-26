'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { companySchema, type CompanyFormData } from '@/features/companies/schemas/company'

export interface CreateCompanyState {
  error?: string
  success?: boolean
}

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const profile = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile.data) {
    return { error: 'Perfil no encontrado' }
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
  const agentApiKey = `nk_${crypto.randomUUID().replace(/-/g, '')}`

  const service = createServiceRoleClient()
  const { data: company, error: companyError } = await service
    .from('companies')
    .insert({
      organization_id: profile.data.organization_id,
      name,
      cif,
      classicconta_digits: classiccontaDigits,
      fiscal_year: fiscalYear,
      agent_api_key: agentApiKey,
    })
    .select('id')
    .single()

  if (companyError || !company) {
    return { error: companyError?.message ?? 'No se pudo crear la empresa' }
  }

  const { error: memberError } = await service
    .from('user_companies')
    .insert({ user_id: user.id, company_id: company.id })

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath('/companies')
  return { success: true }
}

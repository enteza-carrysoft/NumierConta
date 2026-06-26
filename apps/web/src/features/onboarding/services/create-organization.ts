'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { OnboardingResult } from '@/features/onboarding/types/onboarding'

function generateAgentKey(): string {
  const prefix = 'ncg_'
  const suffix = crypto.randomUUID().replace(/-/g, '')
  return `${prefix}${suffix}`
}

async function hasProfile(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()
  return data !== null
}

async function createTenant(userId: string, organizationName: string, companyName: string, cif?: string) {
  const admin = createServiceRoleClient()

  const { data: organization, error: orgError } = await admin
    .from('organizations')
    .insert({ name: organizationName })
    .select('id')
    .single()

  if (orgError || !organization) {
    throw new Error(orgError?.message ?? 'Error creando organización')
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      organization_id: organization.id,
      name: companyName,
      cif: cif || null,
      agent_api_key: generateAgentKey(),
    })
    .select('id')
    .single()

  if (companyError || !company) {
    throw new Error(companyError?.message ?? 'Error creando empresa')
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    organization_id: organization.id,
    role: 'owner',
  })

  if (profileError) {
    throw new Error(profileError.message ?? 'Error creando perfil')
  }

  const { error: userCompanyError } = await admin.from('user_companies').insert({
    user_id: userId,
    company_id: company.id,
  })

  if (userCompanyError) {
    throw new Error(userCompanyError.message ?? 'Error vinculando usuario y empresa')
  }

  return { organization, company }
}

export async function completeOnboarding(
  _prevState: OnboardingResult | null,
  formData: FormData
): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Debes iniciar sesión para continuar' }
  }

  const alreadyOnboarded = await hasProfile(user.id)
  if (alreadyOnboarded) {
    redirect('/dashboard')
  }

  const organizationName = String(formData.get('organizationName') ?? '').trim()
  const companyName = String(formData.get('companyName') ?? '').trim()
  const cif = String(formData.get('cif') ?? '').trim() || undefined

  if (!organizationName || !companyName) {
    return { success: false, error: 'El nombre de la organización y la empresa son obligatorios' }
  }

  try {
    await createTenant(user.id, organizationName, companyName, cif)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }

  redirect('/dashboard')
}

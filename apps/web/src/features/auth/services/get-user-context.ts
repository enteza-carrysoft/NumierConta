import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const COOKIE_NAME = 'active_company_id'

export type UserContext =
  | { authenticated: false }
  | { authenticated: true; onboarded: false; user: { id: string; email?: string } }
  | {
      authenticated: true
      onboarded: true
      user: { id: string; email?: string }
      profile: { id: string; role: string; organization_id: string }
      companies: { id: string; name: string; organization_id: string }[]
      company: { id: string; name: string; organization_id: string } | null
      organization: { id: string; name: string } | null
    }

export async function getUserContext(): Promise<UserContext> {
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get(COOKIE_NAME)?.value

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authenticated: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      authenticated: true,
      onboarded: false,
      user: { id: user.id, email: user.email },
    }
  }

  const { data: userCompanies } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)

  const companyIds = (userCompanies ?? []).map((row) => row.company_id)

  const { data: companies } = companyIds.length
    ? await supabase.from('companies').select('id, name, organization_id').in('id', companyIds)
    : { data: [] }

  const companyList = (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    organization_id: c.organization_id,
  }))

  const activeCompany =
    companyList.find((c) => c.id === activeCompanyId) ?? companyList[0] ?? null

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', profile.organization_id)
    .single()

  return {
    authenticated: true,
    onboarded: true,
    user: { id: user.id, email: user.email },
    profile,
    companies: companyList,
    company: activeCompany,
    organization,
  }
}

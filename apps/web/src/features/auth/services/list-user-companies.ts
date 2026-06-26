import { createClient } from '@/lib/supabase/server'

export interface UserCompany {
  id: string
  name: string
  organizationId: string
}

export async function listUserCompanies(): Promise<UserCompany[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data } = await supabase
    .from('user_companies')
    .select('company_id, companies(id, name, organization_id)')
    .eq('user_id', user.id)

  return (data ?? [])
    .filter((row) => row.companies)
    .map((row) => ({
      id: row.company_id,
      name: (row.companies as unknown as { name: string }).name,
      organizationId: (row.companies as unknown as { organization_id: string }).organization_id,
    }))
}

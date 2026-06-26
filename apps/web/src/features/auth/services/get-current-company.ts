import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const COOKIE_NAME = 'active_company_id'

export interface CurrentCompany {
  userId: string
  companyId: string
}

export async function getCurrentCompany(): Promise<CurrentCompany | null> {
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get(COOKIE_NAME)?.value

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  if (activeCompanyId) {
    const { data: membership } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', activeCompanyId)
      .single()

    if (membership) {
      return { userId: user.id, companyId: membership.company_id }
    }
  }

  const { data: firstCompany } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)
    .order('company_id')
    .limit(1)
    .single()

  if (!firstCompany) {
    return null
  }

  return { userId: user.id, companyId: firstCompany.company_id }
}

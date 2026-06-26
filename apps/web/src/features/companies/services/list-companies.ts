import { createClient } from '@/lib/supabase/server'

export interface Company {
  id: string
  name: string
  cif: string | null
  classiccontaDigits: number
  fiscalYear: number | null
}

export async function listCompanies(): Promise<Company[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: memberships } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)

  const ids = memberships?.map((m) => m.company_id) ?? []
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('companies')
    .select('id, name, cif, classicconta_digits, fiscal_year')
    .in('id', ids)
    .order('name')

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    cif: c.cif,
    classiccontaDigits: c.classicconta_digits ?? 8,
    fiscalYear: c.fiscal_year,
  }))
}

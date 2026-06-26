import { createClient } from '@/lib/supabase/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export interface Account {
  id: string
  code: string
  title: string
  nif: string | null
  vatType: string | null
  vatRate: number | null
  surchargeRate: number | null
  accountClass: string | null
}

export async function listAccounts(): Promise<Account[]> {
  const company = await getCurrentCompany()
  if (!company) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id, code, title, nif, vat_type, vat_rate, surcharge_rate, account_class')
    .eq('company_id', company.companyId)
    .order('code')

  return (data ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    nif: a.nif,
    vatType: a.vat_type,
    vatRate: a.vat_rate ? Number(a.vat_rate) : null,
    surchargeRate: a.surcharge_rate ? Number(a.surcharge_rate) : null,
    accountClass: a.account_class,
  }))
}

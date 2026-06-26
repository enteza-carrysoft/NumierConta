import { createClient } from '@/lib/supabase/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export interface DashboardStats {
  totalCompanies: number
  monthBatches: number
  monthEntries: number
  monthAmount: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const company = await getCurrentCompany()
  const supabase = await createClient()

  if (!company) {
    return { totalCompanies: 0, monthBatches: 0, monthEntries: 0, monthAmount: 0 }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count: totalCompanies } = await supabase
    .from('user_companies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', company.userId)

  const { count: monthBatches } = await supabase
    .from('batches')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.companyId)
    .gte('created_at', startOfMonth)

  const { count: monthEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.companyId)
    .gte('entry_date', startOfMonth.slice(0, 10))

  const { data: lines } = await supabase
    .from('entry_lines')
    .select('debit, credit')
    .eq('company_id', company.companyId)
    .gte('created_at', startOfMonth)

  const monthAmount = (lines ?? []).reduce(
    (sum, line) => sum + Number(line.debit ?? 0) + Number(line.credit ?? 0),
    0
  )

  return {
    totalCompanies: totalCompanies ?? 0,
    monthBatches: monthBatches ?? 0,
    monthEntries: monthEntries ?? 0,
    monthAmount,
  }
}

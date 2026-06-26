import { createClient } from '@/lib/supabase/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export interface Batch {
  id: string
  periodFrom: string | null
  periodTo: string | null
  status: string
  totalDebit: number
  totalCredit: number
  balanced: boolean | null
  createdAt: string
}

export async function listBatches(): Promise<Batch[]> {
  const company = await getCurrentCompany()
  if (!company) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('batches')
    .select('id, period_from, period_to, status, total_debit, total_credit, balanced, created_at')
    .eq('company_id', company.companyId)
    .order('created_at', { ascending: false })

  return (data ?? []).map((b) => ({
    id: b.id,
    periodFrom: b.period_from,
    periodTo: b.period_to,
    status: b.status,
    totalDebit: Number(b.total_debit ?? 0),
    totalCredit: Number(b.total_credit ?? 0),
    balanced: b.balanced,
    createdAt: b.created_at,
  }))
}

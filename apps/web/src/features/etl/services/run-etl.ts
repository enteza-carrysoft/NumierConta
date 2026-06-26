'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export interface RunEtlState {
  error?: string
  success?: boolean
  batchId?: string
}

export async function runEtlAction(_prevState: RunEtlState, formData: FormData): Promise<RunEtlState> {
  const company = await getCurrentCompany()
  if (!company) {
    return { error: 'No hay empresa activa' }
  }

  const periodFrom = (formData.get('period_from') as string) || defaultPeriodFrom()
  const periodTo = (formData.get('period_to') as string) || defaultPeriodTo()

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ')

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/etl/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        company_id: company.companyId,
        period_from: periodFrom,
        period_to: periodTo,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { error: data.error ?? `Error ${res.status}` }
    }

    revalidatePath('/batches')
    revalidatePath('/dashboard')
    return { success: true, batchId: data.batch_id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

function defaultPeriodFrom(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function defaultPeriodTo(): string {
  return new Date().toISOString().slice(0, 10)
}

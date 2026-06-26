'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { accountSchema } from '@/features/accounts/schemas/account'

export interface UpdateAccountState {
  error?: string
  success?: boolean
}

export async function updateAccount(
  _prevState: UpdateAccountState,
  formData: FormData
): Promise<UpdateAccountState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const accountId = formData.get('id') as string
  if (!accountId) {
    return { error: 'ID requerido' }
  }

  const raw = {
    title: formData.get('title'),
    nif: formData.get('nif') || undefined,
    vatType: formData.get('vatType') || undefined,
    vatRate: formData.get('vatRate') || undefined,
    surchargeRate: formData.get('surchargeRate') || undefined,
    accountClass: formData.get('accountClass') || undefined,
  }

  const parsed = accountSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const { title, nif, vatType, vatRate, surchargeRate, accountClass } = parsed.data

  const { error } = await supabase
    .from('accounts')
    .update({
      title,
      nif,
      vat_type: vatType,
      vat_rate: vatRate,
      surcharge_rate: surchargeRate,
      account_class: accountClass,
    })
    .eq('id', accountId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true }
}

import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden } from './respond'
import type { NextResponse } from 'next/server'

export type UserAuthResult =
  | { success: true; userId: string }
  | { success: false; response: NextResponse }

export async function authenticateUser(request: Request): Promise<UserAuthResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { success: false, response: unauthorized('Authentication required') }
  }

  return { success: true, userId: data.user.id }
}

export async function authorizeCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    return false
  }

  return true
}

export function companyForbidden() {
  return forbidden('User does not have access to this company')
}

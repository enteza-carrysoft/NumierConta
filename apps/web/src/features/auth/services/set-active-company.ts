'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const COOKIE_NAME = 'active_company_id'

export async function setActiveCompany(companyId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, companyId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath('/', 'layout')
}

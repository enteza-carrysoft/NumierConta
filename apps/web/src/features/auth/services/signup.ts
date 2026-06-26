'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthResult } from '@/features/auth/types/auth'

export async function signup(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { success: false, error: 'Email y contraseña son obligatorios' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/dashboard`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, redirectTo: '/onboarding' }
}

export async function signupWithRedirect(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/dashboard`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, redirectTo: '/onboarding' }
}

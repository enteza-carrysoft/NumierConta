import { redirect } from 'next/navigation'
import { getUserContext } from '@/features/auth/services/get-user-context'

export default async function HomePage() {
  const context = await getUserContext()

  if (!context.authenticated) {
    redirect('/login')
  }

  if (!context.onboarded) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

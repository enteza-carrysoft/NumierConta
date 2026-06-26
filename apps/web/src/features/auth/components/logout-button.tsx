'use client'

import { useFormStatus } from 'react-dom'
import { logout } from '@/features/auth/services/logout'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
    >
      {pending ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  )
}

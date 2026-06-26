'use client'

import { useActionState } from 'react'
import { completeOnboarding } from '@/features/onboarding/services/create-organization'

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(completeOnboarding, null)

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
          Nombre de la organización
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Mi Grupo Hostelero"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Nombre de la primera empresa
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Restaurante Principal"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="cif" className="block text-sm font-medium text-gray-700">
          CIF/NIF (opcional)
        </label>
        <input
          id="cif"
          name="cif"
          type="text"
          placeholder="Ej. B12345678"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      {state?.success === false && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'Configurando...' : 'Crear empresa'}
      </button>
    </form>
  )
}

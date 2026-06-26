'use client'

import { useActionState } from 'react'
import { Button } from '@/shared/components/ui/button'
import type { Company } from '@/features/companies/services/list-companies'
import type { CreateCompanyState } from '@/features/companies/services/create-company'
import type { UpdateCompanyState } from '@/features/companies/services/update-company'

interface CompanyFormProps {
  company?: Company
  action: (prevState: CreateCompanyState | UpdateCompanyState, formData: FormData) => Promise<CreateCompanyState | UpdateCompanyState>
}

export function CompanyForm({ company, action }: CompanyFormProps) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-4">
      {company && <input type="hidden" name="id" value={company.id} />}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={company?.name}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="cif" className="block text-sm font-medium text-gray-700">
          CIF
        </label>
        <input
          id="cif"
          name="cif"
          type="text"
          defaultValue={company?.cif ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="classiccontaDigits" className="block text-sm font-medium text-gray-700">
          Dígitos de subcuenta ClassicConta
        </label>
        <input
          id="classiccontaDigits"
          name="classiccontaDigits"
          type="number"
          min={6}
          max={12}
          defaultValue={company?.classiccontaDigits ?? 8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="fiscalYear" className="block text-sm font-medium text-gray-700">
          Ejercicio fiscal
        </label>
        <input
          id="fiscalYear"
          name="fiscalYear"
          type="number"
          defaultValue={company?.fiscalYear ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Guardado correctamente</p>}

      <Button type="submit">{company ? 'Guardar cambios' : 'Crear empresa'}</Button>
    </form>
  )
}

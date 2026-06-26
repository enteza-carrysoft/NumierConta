'use client'

import { useActionState } from 'react'
import { Button } from '@/shared/components/ui/button'
import type { MappingRule } from '@numierconta/shared/schemas/mapping-rule'
import type { MappingFormState } from '@/features/mapping/services/form-actions'

interface MappingFormProps {
  companyId: string
  rule?: MappingRule
  action: (prevState: MappingFormState, formData: FormData) => Promise<MappingFormState>
}

export function MappingForm({ companyId, rule, action }: MappingFormProps) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="company_id" value={companyId} />
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div>
        <label htmlFor="rule_type" className="block text-sm font-medium text-gray-700">
          Tipo de regla
        </label>
        <select
          id="rule_type"
          name="rule_type"
          defaultValue={rule?.rule_type ?? 'sales_by_vat'}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="sales_by_vat">Ventas por tipo de IVA</option>
          <option value="payment_method">Método de pago</option>
          <option value="expense_category">Categoría de gasto</option>
          <option value="invitation">Invitación</option>
        </select>
      </div>

      <div>
        <label htmlFor="match_key" className="block text-sm font-medium text-gray-700">
          Clave de coincidencia
        </label>
        <input
          id="match_key"
          name="match_key"
          type="text"
          defaultValue={rule?.match_key ?? ''}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="debit_account" className="block text-sm font-medium text-gray-700">
            Cuenta débito
          </label>
          <input
            id="debit_account"
            name="debit_account"
            type="text"
            defaultValue={rule?.debit_account ?? ''}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="credit_account" className="block text-sm font-medium text-gray-700">
            Cuenta crédito
          </label>
          <input
            id="credit_account"
            name="credit_account"
            type="text"
            defaultValue={rule?.credit_account ?? ''}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="vat_account" className="block text-sm font-medium text-gray-700">
          Cuenta IVA (opcional)
        </label>
        <input
          id="vat_account"
          name="vat_account"
          type="text"
          defaultValue={rule?.vat_account ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Prioridad
          </label>
          <input
            id="priority"
            name="priority"
            type="number"
            min={0}
            max={9999}
            defaultValue={rule?.priority ?? 100}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={rule?.active ?? true}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
            Activa
          </label>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Guardado correctamente</p>}

      <Button type="submit">{rule ? 'Guardar cambios' : 'Crear regla'}</Button>
    </form>
  )
}

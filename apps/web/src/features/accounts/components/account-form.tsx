'use client'

import { useActionState } from 'react'
import { Button } from '@/shared/components/ui/button'
import type { Account } from '@/features/accounts/services/list-accounts'
import type { UpdateAccountState } from '@/features/accounts/services/update-account'

interface AccountFormProps {
  account: Account
  action: (prevState: UpdateAccountState, formData: FormData) => Promise<UpdateAccountState>
}

export function AccountForm({ account, action }: AccountFormProps) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={account.id} />

      <div>
        <label className="block text-sm font-medium text-gray-700">Código</label>
        <p className="text-sm text-gray-900">{account.code}</p>
      </div>

      <div>
        <label htmlFor={`title-${account.id}`} className="block text-sm font-medium text-gray-700">
          Título
        </label>
        <input
          id={`title-${account.id}`}
          name="title"
          type="text"
          defaultValue={account.title}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor={`nif-${account.id}`} className="block text-sm font-medium text-gray-700">
          NIF
        </label>
        <input
          id={`nif-${account.id}`}
          name="nif"
          type="text"
          defaultValue={account.nif ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor={`vatType-${account.id}`} className="block text-sm font-medium text-gray-700">
          Tipo IVA ClassicConta
        </label>
        <select
          id={`vatType-${account.id}`}
          name="vatType"
          defaultValue={account.vatType ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">—</option>
          <option value="G">G (General)</option>
          <option value="N">N (No sujeto)</option>
          <option value="I">I (Inversión sujeto pasivo)</option>
          <option value="P">P (Parcialmente deducible)</option>
          <option value="J">J (No deducible)</option>
          <option value="T">T (Totalmente deducible)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`vatRate-${account.id}`} className="block text-sm font-medium text-gray-700">
            % IVA
          </label>
          <input
            id={`vatRate-${account.id}`}
            name="vatRate"
            type="number"
            step="0.01"
            defaultValue={account.vatRate ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor={`surchargeRate-${account.id}`} className="block text-sm font-medium text-gray-700">
            % Recargo
          </label>
          <input
            id={`surchargeRate-${account.id}`}
            name="surchargeRate"
            type="number"
            step="0.01"
            defaultValue={account.surchargeRate ?? ''}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`accountClass-${account.id}`} className="block text-sm font-medium text-gray-700">
          Clase contable
        </label>
        <select
          id={`accountClass-${account.id}`}
          name="accountClass"
          defaultValue={account.accountClass ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">—</option>
          <option value="sales">Ventas</option>
          <option value="vat_out">IVA repercutido</option>
          <option value="vat_in">IVA soportado</option>
          <option value="cash">Caja</option>
          <option value="bank">Banco</option>
          <option value="expense">Gasto</option>
          <option value="customer">Cliente</option>
          <option value="supplier">Proveedor</option>
          <option value="invitation">Invitación</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Guardado correctamente</p>}

      <Button type="submit">Guardar cambios</Button>
    </form>
  )
}

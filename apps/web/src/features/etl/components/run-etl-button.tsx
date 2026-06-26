'use client'

import { useActionState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import type { RunEtlState } from '@/features/etl/services/run-etl'

interface RunEtlButtonProps {
  action: (prevState: RunEtlState, formData: FormData) => Promise<RunEtlState>
}

export function RunEtlButton({ action }: RunEtlButtonProps) {
  const [state, formAction] = useActionState(action, {})

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <h2 className="text-lg font-semibold">Generar lotes contables</h2>
        <p className="text-sm text-gray-600">
          Ejecuta el ETL para convertir los datos del simulador/agente en asientos contables.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="period_from" className="block text-sm font-medium text-gray-700">
              Desde
            </label>
            <input
              id="period_from"
              name="period_from"
              type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="period_to" className="block text-sm font-medium text-gray-700">
              Hasta
            </label>
            <input
              id="period_to"
              name="period_to"
              type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <Button type="submit">Ejecutar ETL</Button>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-green-600">
            ETL ejecutado correctamente. Lote: {state.batchId}
          </p>
        )}
      </form>
    </Card>
  )
}

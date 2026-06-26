'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { MappingForm } from './mapping-form'
import type { MappingRule } from '@numierconta/shared/schemas/mapping-rule'
import type { MappingFormState } from '@/features/mapping/services/form-actions'

interface MappingListProps {
  companyId: string
  rules: MappingRule[]
  createAction: (prevState: MappingFormState, formData: FormData) => Promise<MappingFormState>
  updateAction: (prevState: MappingFormState, formData: FormData) => Promise<MappingFormState>
  deleteAction: (formData: FormData) => Promise<void>
}

export function MappingList({ companyId, rules, createAction, updateAction, deleteAction }: MappingListProps) {
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Nueva regla de mapeo</h2>
        <MappingForm companyId={companyId} action={createAction} />
      </Card>

      <div className="space-y-4">
        {rules.length === 0 && <p className="text-gray-600">No hay reglas de mapeo configuradas.</p>}
        {rules.map((rule) => (
          <Card key={rule.id}>
            {editing === rule.id ? (
              <MappingForm companyId={companyId} rule={rule} action={updateAction} />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {rule.rule_type} — <span className="font-normal text-gray-600">{rule.match_key}</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Débito: {rule.debit_account} | Crédito: {rule.credit_account}
                    {rule.vat_account ? ` | IVA: ${rule.vat_account}` : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    Prioridad: {rule.priority} | {rule.active ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setEditing(rule.id)}>
                    Editar
                  </Button>
                  <form action={deleteAction}>
                    <input type="hidden" name="company_id" value={companyId} />
                    <input type="hidden" name="id" value={rule.id} />
                    <Button type="submit" variant="danger" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

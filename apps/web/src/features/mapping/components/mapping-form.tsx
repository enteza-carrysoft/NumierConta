'use client'

import { useActionState, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useSuggestMapping } from '@/features/mapping/hooks/use-suggest-mapping'
import type { MappingRule } from '@numierconta/shared/schemas/mapping-rule'
import type { MappingFormState } from '@/features/mapping/services/form-actions'

interface MappingFormProps {
  companyId: string
  rule?: MappingRule
  action: (prevState: MappingFormState, formData: FormData) => Promise<MappingFormState>
}

type RuleType = 'sales_by_vat' | 'payment_method' | 'expense_category' | 'invitation'

export function MappingForm({ companyId, rule, action }: MappingFormProps) {
  const [state, formAction] = useActionState(action, {})
  const { suggest, loading: suggesting, error: suggestError } = useSuggestMapping()

  const [ruleType, setRuleType] = useState<RuleType>((rule?.rule_type as RuleType) ?? 'sales_by_vat')
  const [matchKey, setMatchKey] = useState(rule?.match_key ?? '')
  const [debitAccount, setDebitAccount] = useState(rule?.debit_account ?? '')
  const [creditAccount, setCreditAccount] = useState(rule?.credit_account ?? '')
  const [vatAccount, setVatAccount] = useState(rule?.vat_account ?? '')
  const [reasoning, setReasoning] = useState<string | null>(null)

  async function handleSuggest() {
    if (!matchKey.trim()) return
    setReasoning(null)
    const suggestion = await suggest({ rule_type: ruleType, match_key: matchKey })
    if (suggestion) {
      setDebitAccount(suggestion.debit_account)
      setCreditAccount(suggestion.credit_account)
      setVatAccount(suggestion.vat_account ?? '')
      setReasoning(suggestion.reasoning)
    }
  }

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
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as RuleType)}
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
          value={matchKey}
          onChange={(e) => setMatchKey(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Sugerencia de IA */}
      <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-indigo-700">Sugerencia automática de cuentas</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSuggest}
            disabled={suggesting || !matchKey.trim()}
          >
            {suggesting ? 'Analizando…' : '✦ Sugerir con IA'}
          </Button>
        </div>
        {suggestError && (
          <p className="mt-2 text-sm text-red-600">{suggestError}</p>
        )}
        {reasoning && (
          <p className="mt-2 text-sm text-indigo-600 italic">{reasoning}</p>
        )}
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
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
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
            value={creditAccount}
            onChange={(e) => setCreditAccount(e.target.value)}
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
          value={vatAccount}
          onChange={(e) => setVatAccount(e.target.value)}
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

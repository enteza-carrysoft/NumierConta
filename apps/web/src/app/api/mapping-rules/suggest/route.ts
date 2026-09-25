import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'
import { listMappingRules } from '@/features/mapping/services/list-rules'
import { listAccounts } from '@/features/accounts/services/list-accounts'

const RequestSchema = z.object({
  rule_type: z.enum(['sales_by_vat', 'payment_method', 'expense_category', 'invitation']),
  match_key: z.string().min(1),
})

const SuggestionSchema = z.object({
  debit_account: z.string(),
  credit_account: z.string(),
  vat_account: z.string().optional(),
  reasoning: z.string(),
})

export type MappingSuggestion = z.infer<typeof SuggestionSchema>

const RULE_TYPE_LABELS: Record<string, string> = {
  sales_by_vat: 'Ventas por tipo de IVA',
  payment_method: 'Método de pago',
  expense_category: 'Categoría de gasto',
  invitation: 'Invitación',
}

export async function POST(request: Request): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(', ') },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'IA no configurada (falta ANTHROPIC_API_KEY)' }, { status: 503 })
  }

  const [existingRules, accounts] = await Promise.all([
    listMappingRules(company.companyId),
    listAccounts(),
  ])

  const { rule_type, match_key } = parsed.data

  const accountsCatalog = accounts.length > 0
    ? accounts.map((a) => `${a.code} — ${a.title}${a.accountClass ? ` (${a.accountClass})` : ''}`).join('\n')
    : '(catálogo no disponible — usar cuentas estándar del PGC español)'

  const existingRulesText = existingRules.length > 0
    ? existingRules
        .map((r) => `- ${r.rule_type} | ${r.match_key} → débito: ${r.debit_account}, crédito: ${r.credit_account}${r.vat_account ? `, IVA: ${r.vat_account}` : ''}`)
        .join('\n')
    : '(ninguna regla configurada aún)'

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: `Eres un experto en contabilidad española (Plan General Contable).
Tu tarea es sugerir las cuentas contables correctas para una regla de mapeo.
Responde SIEMPRE en JSON válido con esta estructura exacta:
{
  "debit_account": "código de cuenta (max 12 chars)",
  "credit_account": "código de cuenta (max 12 chars)",
  "vat_account": "código de cuenta IVA si aplica, omitir si no",
  "reasoning": "explicación breve en castellano de por qué estas cuentas"
}
No añadas texto antes ni después del JSON.`,
    messages: [
      {
        role: 'user',
        content: `Sugiere las cuentas para esta regla de mapeo:

Tipo de regla: ${RULE_TYPE_LABELS[rule_type]} (${rule_type})
Clave de coincidencia: "${match_key}"

Catálogo de cuentas disponible:
${accountsCatalog}

Reglas ya configuradas (para mantener consistencia):
${existingRulesText}`,
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'La IA no devolvió una sugerencia' }, { status: 500 })
  }

  let suggestion: unknown
  try {
    suggestion = JSON.parse(textBlock.text)
  } catch {
    return NextResponse.json({ error: 'Respuesta de IA inválida' }, { status: 500 })
  }

  const validated = SuggestionSchema.safeParse(suggestion)
  if (!validated.success) {
    return NextResponse.json({ error: 'Formato de sugerencia incorrecto' }, { status: 500 })
  }

  return NextResponse.json({ suggestion: validated.data })
}

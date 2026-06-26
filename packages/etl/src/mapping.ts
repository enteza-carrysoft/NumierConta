import type { MappingRule } from '@numierconta/shared'

export function resolveSalesAccount(
  rules: MappingRule[],
  vatRate: number
): string {
  const rule = findRule(rules, 'sales_by_vat', String(vatRate))
  if (!rule?.credit_account) {
    throw new Error(`No sales account mapping for VAT rate ${vatRate}`)
  }
  return rule.credit_account
}

export function resolveVatOutAccount(
  rules: MappingRule[],
  vatRate: number
): string | null {
  const rule = findRule(rules, 'sales_by_vat', String(vatRate))
  return rule?.vat_account ?? null
}

export function resolveDefaultSalesAccount(rules: MappingRule[]): string {
  const zeroRule = findRule(rules, 'sales_by_vat', '0')
  if (zeroRule?.credit_account) {
    return zeroRule.credit_account
  }

  const fallback = rules
    .filter((rule) => rule.rule_type === 'sales_by_vat' && rule.active)
    .sort((a, b) => Number(a.match_key) - Number(b.match_key))[0]

  if (!fallback?.credit_account) {
    throw new Error('No default sales account mapping')
  }
  return fallback.credit_account
}

export function resolvePaymentAccount(
  rules: MappingRule[],
  method: 'EFECTIVO' | 'TARJETA' | 'CHEQUE'
): string {
  const rule = findRule(rules, 'payment_method', method)
  if (!rule?.debit_account) {
    throw new Error(`No payment account mapping for method ${method}`)
  }
  return rule.debit_account
}

export function resolveInvitationAccount(rules: MappingRule[]): string {
  const rule = findRule(rules, 'invitation', 'DEFAULT')
  if (!rule?.debit_account) {
    throw new Error('No invitation account mapping')
  }
  return rule.debit_account
}

export function resolveInvitationContraAccount(rules: MappingRule[]): string {
  const rule = findRule(rules, 'invitation', 'DEFAULT')
  if (rule?.credit_account) {
    return rule.credit_account
  }
  return resolveDefaultSalesAccount(rules)
}

export function resolveExpenseAccount(
  rules: MappingRule[],
  categoryId: string | null
): string {
  const rule =
    (categoryId ? findRule(rules, 'expense_category', categoryId) : undefined) ??
    findRule(rules, 'expense_category', 'DEFAULT')
  if (!rule?.debit_account) {
    throw new Error(`No expense account mapping for category ${categoryId}`)
  }
  return rule.debit_account
}

export function resolveVatInAccount(
  rules: MappingRule[],
  vatRate: number
): string | null {
  const rule = findRule(rules, 'expense_category', String(vatRate))
  return rule?.vat_account ?? null
}

function findRule(
  rules: MappingRule[],
  ruleType: MappingRule['rule_type'],
  matchKey: string
): MappingRule | undefined {
  return rules
    .filter((rule) => rule.rule_type === ruleType && rule.active)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .find((rule) => rule.match_key === matchKey)
}

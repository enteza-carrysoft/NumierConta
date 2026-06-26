import { round2, sumBy, groupBy } from './utils'
import { calculateBalance, adjustRounding } from './balance'
import { resolveExpenseAccount, resolvePaymentAccount } from './mapping'
import type { StgExpenseHead, StgExpenseLine, StgSupplier } from './types'
import type { Account, MappingRule, EntryDraft, EntryLineDraft } from '@numierconta/shared'

export interface BuildExpenseEntryInput {
  expense: StgExpenseHead
  lines: StgExpenseLine[]
  rules: MappingRule[]
  suppliers: StgSupplier[]
  accounts: Account[]
  classiccontaDigits: number
}

export function buildExpenseEntry(input: BuildExpenseEntryInput): EntryDraft {
  const { expense, lines, rules, suppliers, accounts, classiccontaDigits } = input
  const supplier = suppliers.find((item) => item.numier_con_id === expense.supplier_id)

  const concept = `FRA ${expense.invoice_ref ?? expense.numier_gac_id}`
  const entryLines: EntryLineDraft[] = []

  // Debe: gasto + IVA soportado por tipo
  const grouped = groupBy(lines, (line) => line.vat_rate ?? 0)

  for (const [rateStr, groupLines] of Object.entries(grouped)) {
    const rate = Number(rateStr)
    const base = sumBy(groupLines, (line) => line.amount ?? 0)
    const quota = round2(base * (rate / 100))

    entryLines.push({
      account_code: resolveExpenseDebitAccount(rules, accounts, supplier),
      concept: `${concept} MP`,
      debit: base,
      credit: 0,
      vat_invoice_type: 'R',
    })

    if (quota > 0) {
      const vatAccount = resolveVatInAccount(accounts, rate)
      if (vatAccount) {
        entryLines.push({
          account_code: vatAccount,
          concept: `${concept} IVA`,
          debit: quota,
          credit: 0,
          vat_invoice_type: 'R',
        })
      }
    }
  }

  // Haber: proveedor o caja
  const creditAccount = expense.from_cash
    ? resolvePaymentAccount(rules, 'EFECTIVO')
    : resolveSupplierAccount(suppliers, accounts, expense.supplier_id, classiccontaDigits)

  entryLines.push({
    account_code: creditAccount,
    concept: `${concept} PAGO`,
    debit: 0,
    credit: round2(expense.total ?? 0),
    vat_invoice_type: 'R',
  })

  const adjustedLines = adjustRounding(entryLines)
  const balance = calculateBalance(adjustedLines)

  return {
    entry_date: expense.expense_date,
    concept,
    doc_number: expense.invoice_ref ?? undefined,
    source_type: 'expense',
    source_ref: String(expense.numier_gac_id),
    lines: adjustedLines,
    balanced: balance.balanced,
  }
}

function resolveExpenseDebitAccount(
  rules: MappingRule[],
  accounts: Account[],
  supplier?: StgSupplier
): string {
  const categoryKey = supplier?.category_id !== null && supplier?.category_id !== undefined
    ? String(supplier.category_id)
    : supplier?.numier_con_id !== null && supplier?.numier_con_id !== undefined
      ? String(supplier.numier_con_id)
      : 'DEFAULT'

  try {
    return resolveExpenseAccount(rules, categoryKey)
  } catch {
    const fallbackAccount = accounts.find((account) => account.account_class === 'expense')
    if (fallbackAccount?.code) {
      return fallbackAccount.code
    }
    throw new Error(`No expense account mapping for category ${categoryKey}`)
  }
}

function resolveVatInAccount(
  accounts: Account[],
  vatRate: number
): string | null {
  const account = accounts.find(
    (acc) => acc.account_class === 'vat_in' && acc.vat_rate === vatRate
  )
  return account?.code ?? null
}

function resolveSupplierAccount(
  suppliers: StgSupplier[],
  accounts: Account[],
  supplierId: number | null,
  classiccontaDigits: number
): string {
  if (supplierId === null) {
    const suffix = ''.padStart(classiccontaDigits - 3, '0')
    return `400${suffix}`
  }

  const supplier = suppliers.find((s) => s.numier_con_id === supplierId)
  const nif = supplier?.nif

  const existing = accounts.find(
    (account) => account.account_class === 'supplier' && nif && account.nif === nif
  )

  if (existing) {
    return existing.code
  }

  const suffix = String(supplierId).padStart(classiccontaDigits - 3, '0')
  return `400${suffix}`
}

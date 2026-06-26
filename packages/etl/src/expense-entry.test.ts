import { describe, it, expect } from 'vitest'
import { buildExpenseEntry } from './expense-entry'
import type { StgExpenseHead, StgExpenseLine, StgSupplier } from './types'
import type { Account, MappingRule } from '@numierconta/shared'

const rules: MappingRule[] = [
  {
    id: 'r1',
    company_id: 'c1',
    rule_type: 'expense_category',
    match_key: '7',
    debit_account: '60000001',
    credit_account: null,
    vat_account: '47200002',
    priority: 100,
    active: true,
  },
  {
    id: 'r2',
    company_id: 'c1',
    rule_type: 'payment_method',
    match_key: 'EFECTIVO',
    debit_account: '57000001',
    credit_account: null,
    vat_account: null,
    priority: 100,
    active: true,
  },
]

const expense: StgExpenseHead = {
  company_id: 'c1',
  numier_gac_id: 501,
  expense_date: '2026-06-14',
  supplier_id: 7,
  total: 352,
  from_cash: false,
  invoice_ref: 'DISTRIB SUR',
}

const lines: StgExpenseLine[] = [
  {
    company_id: 'c1',
    numier_gac_id: 501,
    line_seq: 1,
    amount: 320,
    total: 352,
    vat_rate: 10,
  },
]

const suppliers: StgSupplier[] = [
  {
    company_id: 'c1',
    numier_con_id: 7,
    nif: '87654321B',
    name: 'Distrib Sur',
    address: null,
    postal_code: null,
    city: null,
    province: null,
    category_id: null,
  },
]

const accounts: Account[] = [
  {
    id: 'a1',
    company_id: 'c1',
    code: '47200002',
    title: 'HP IVA soportado 10%',
    nif: null,
    vat_type: 'G',
    vat_rate: 10,
    surcharge_rate: null,
    account_class: 'vat_in',
  },
]

describe('buildExpenseEntry', () => {
  it('genera el asiento de gasto del ejemplo 7.4', () => {
    const entry = buildExpenseEntry({
      expense,
      lines,
      rules,
      suppliers,
      accounts,
      classiccontaDigits: 8,
    })

    expect(entry.source_type).toBe('expense')
    if (!entry.balanced) {
      console.log('Expense entry lines:', JSON.stringify(entry.lines, null, 2))
    }
    expect(entry.balanced).toBe(true)

    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0)

    expect(totalDebit).toBe(352)
    expect(totalCredit).toBe(352)

    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '60000001', debit: 320, vat_invoice_type: 'R' })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '47200002', debit: 32, vat_invoice_type: 'R' })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '40000007', credit: 352, vat_invoice_type: 'R' })
    )
  })
})

import { describe, it, expect } from 'vitest'
import { buildClosureEntry } from './closure-entry'
import type { StgClosure, StgTicketHead, StgTicketLine } from './types'
import type { MappingRule } from '@numierconta/shared'

const rules: MappingRule[] = [
  {
    id: 'r1',
    company_id: 'c1',
    rule_type: 'sales_by_vat',
    match_key: '21',
    credit_account: '70000001',
    vat_account: '47700001',
    debit_account: null,
    priority: 100,
    active: true,
  },
  {
    id: 'r2',
    company_id: 'c1',
    rule_type: 'sales_by_vat',
    match_key: '10',
    credit_account: '70000002',
    vat_account: '47700002',
    debit_account: null,
    priority: 100,
    active: true,
  },
  {
    id: 'r2b',
    company_id: 'c1',
    rule_type: 'sales_by_vat',
    match_key: '0',
    credit_account: '70000004',
    vat_account: null,
    debit_account: null,
    priority: 100,
    active: true,
  },
  {
    id: 'r3',
    company_id: 'c1',
    rule_type: 'payment_method',
    match_key: 'EFECTIVO',
    debit_account: '57000001',
    credit_account: null,
    vat_account: null,
    priority: 100,
    active: true,
  },
  {
    id: 'r4',
    company_id: 'c1',
    rule_type: 'payment_method',
    match_key: 'TARJETA',
    debit_account: '57200001',
    credit_account: null,
    vat_account: null,
    priority: 100,
    active: true,
  },
  {
    id: 'r5',
    company_id: 'c1',
    rule_type: 'invitation',
    match_key: 'DEFAULT',
    debit_account: '65900001',
    credit_account: '70000002',
    vat_account: null,
    priority: 100,
    active: true,
  },
]

const closure: StgClosure = {
  company_id: 'c1',
  numier_fec_id: 1,
  opened_at: '2026-06-15T08:00:00Z',
  closed_at: '2026-06-15T23:00:00Z',
  total_cash: 874,
  total_card: 600,
  total_sales: 1500,
  change_kept: 0,
  withdrawals: 0,
}

const heads: StgTicketHead[] = [
  {
    company_id: 'c1',
    numier_cab_id: 101,
    ticket_date: '2026-06-15',
    ticket_time: '13:00:00',
    operator_code: '00001',
    state: 'C',
    payment_main: 'E',
    amount_card: 600,
    amount_check: 0,
    invoice_number: '',
    customer_nif: '',
    doc_number: 'T001',
    numier_cli_id: null,
    total: 1474,
    closure_fec_id: 1,
  },
  {
    company_id: 'c1',
    numier_cab_id: 102,
    ticket_date: '2026-06-15',
    ticket_time: '14:00:00',
    operator_code: '00001',
    state: 'I',
    payment_main: 'E',
    amount_card: 0,
    amount_check: 0,
    invoice_number: '',
    customer_nif: '',
    doc_number: 'T002',
    numier_cli_id: null,
    total: 26,
    closure_fec_id: 1,
  },
]

const lines: StgTicketLine[] = [
  // Ventas 21%: base 400 + IVA 84 = 484
  {
    company_id: 'c1',
    numier_cab_id: 101,
    line_seq: 1,
    article_code: 'ART21',
    qty: 1,
    unit_price: 484,
    line_amount: 484,
    vat_rate: 21,
    description: 'Venta 21%',
  },
  // Ventas 10%: base 900 + IVA 90 = 990
  {
    company_id: 'c1',
    numier_cab_id: 101,
    line_seq: 2,
    article_code: 'ART10',
    qty: 1,
    unit_price: 990,
    line_amount: 990,
    vat_rate: 10,
    description: 'Venta 10%',
  },
  // Invitación 26
  {
    company_id: 'c1',
    numier_cab_id: 102,
    line_seq: 1,
    article_code: 'INVIT',
    qty: 1,
    unit_price: 26,
    line_amount: 26,
    vat_rate: 0,
    description: 'Invitacion',
  },
]

describe('buildClosureEntry', () => {
  it('genera el asiento de cierre Z del ejemplo 7.4', () => {
    const entry = buildClosureEntry({ closure, tickets: heads, lines, rules })

    expect(entry.source_type).toBe('closure')
    expect(entry.source_ref).toBe('1')
    expect(entry.entry_date).toBe('2026-06-15')
    expect(entry.balanced).toBe(true)

    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0)

    expect(totalDebit).toBe(1500)
    expect(totalCredit).toBe(1500)

    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '57000001', debit: 874 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '57200001', debit: 600 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '65900001', debit: 26 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '70000001', credit: 400 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '47700001', credit: 84 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '70000002', credit: 900 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '47700002', credit: 90 })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '70000002', credit: 26 })
    )
  })
})

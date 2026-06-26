import { describe, it, expect } from 'vitest'
import { buildInvoiceEntry } from './invoice-entry'
import type { StgTicketHead, StgTicketLine, StgCustomer } from './types'
import type { Account, MappingRule } from '@numierconta/shared'

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
]

const ticket: StgTicketHead = {
  company_id: 'c1',
  numier_cab_id: 200,
  ticket_date: '2026-06-15',
  ticket_time: '12:00:00',
  operator_code: '00001',
  state: 'C',
  payment_main: 'E',
  amount_card: 0,
  amount_check: 0,
  invoice_number: 'F-001',
  customer_nif: '12345678A',
  doc_number: 'F-001',
  numier_cli_id: 5,
  total: 121,
  closure_fec_id: 1,
}

const lines: StgTicketLine[] = [
  {
    company_id: 'c1',
    numier_cab_id: 200,
    line_seq: 1,
    article_code: 'ART',
    qty: 1,
    unit_price: 121,
    line_amount: 121,
    vat_rate: 21,
    description: 'Producto',
  },
]

const customers: StgCustomer[] = [
  {
    company_id: 'c1',
    numier_cli_id: 5,
    nif: '12345678A',
    name: 'Cliente Test',
    address: null,
    postal_code: null,
    city: null,
    province: null,
  },
]

const accounts: Account[] = []

describe('buildInvoiceEntry', () => {
  it('genera asiento de factura nominal con IVA 21%', () => {
    const entry = buildInvoiceEntry({
      ticket,
      lines,
      rules,
      customers,
      accounts,
      classiccontaDigits: 8,
    })

    expect(entry.source_type).toBe('invoice')
    expect(entry.balanced).toBe(true)

    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0)

    expect(totalDebit).toBe(121)
    expect(totalCredit).toBe(121)

    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '43000005', debit: 121, vat_invoice_type: 'E' })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '70000001', credit: 100, vat_invoice_type: 'E' })
    )
    expect(entry.lines).toContainEqual(
      expect.objectContaining({ account_code: '47700001', credit: 21, vat_invoice_type: 'E' })
    )
  })
})

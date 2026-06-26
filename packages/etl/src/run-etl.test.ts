import { describe, it, expect } from 'vitest'
import { runEtl } from './run-etl'
import type { EtlInput, StgClosure, StgTicketHead, StgTicketLine, StgExpenseHead, StgExpenseLine, StgCustomer, StgSupplier } from './types'
import type { Account, MappingRule } from '@numierconta/shared'

const mappingRules: MappingRule[] = [
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
  {
    id: 'r6',
    company_id: 'c1',
    rule_type: 'expense_category',
    match_key: '7',
    debit_account: '60000001',
    credit_account: null,
    vat_account: '47200002',
    priority: 100,
    active: true,
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

describe('runEtl', () => {
  it('genera asientos de cierre, factura y gasto', () => {
    const closures: StgClosure[] = [
      {
        company_id: 'c1',
        numier_fec_id: 1,
        opened_at: '2026-06-15T08:00:00Z',
        closed_at: '2026-06-15T23:00:00Z',
        total_cash: 874,
        total_card: 600,
        total_sales: 1500,
        change_kept: 0,
        withdrawals: 0,
      },
    ]

    const ticketHeads: StgTicketHead[] = [
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
      {
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
      },
    ]

    const ticketLines: StgTicketLine[] = [
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

    const expenseHeads: StgExpenseHead[] = [
      {
        company_id: 'c1',
        numier_gac_id: 501,
        expense_date: '2026-06-14',
        supplier_id: 7,
        total: 352,
        from_cash: false,
        invoice_ref: 'DISTRIB SUR',
      },
    ]

    const expenseLines: StgExpenseLine[] = [
      {
        company_id: 'c1',
        numier_gac_id: 501,
        line_seq: 1,
        amount: 320,
        total: 352,
        vat_rate: 10,
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

    const input: EtlInput = {
      companyId: 'c1',
      periodFrom: '2026-06-14',
      periodTo: '2026-06-15',
      closures,
      ticketHeads,
      ticketLines,
      expenseHeads,
      expenseLines,
      customers,
      suppliers,
      accounts,
      mappingRules,
    }

    const result = runEtl(input)

    expect(result.entries).toHaveLength(3)
    expect(result.entries[0].source_type).toBe('closure')
    expect(result.entries[1].source_type).toBe('invoice')
    expect(result.entries[2].source_type).toBe('expense')

    expect(result.entries[0].balanced).toBe(true)
    expect(result.entries[1].balanced).toBe(true)
    expect(result.entries[2].balanced).toBe(true)

    expect(result.entries[0].entry_number).toBe(1)
    expect(result.entries[1].entry_number).toBe(2)
    expect(result.entries[2].entry_number).toBe(3)
  })
})

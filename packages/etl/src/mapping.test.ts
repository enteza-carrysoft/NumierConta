import { describe, it, expect } from 'vitest'
import {
  resolveSalesAccount,
  resolveVatOutAccount,
  resolvePaymentAccount,
  resolveInvitationAccount,
} from './mapping'
import type { MappingRule } from '@numierconta/shared'

const rules: MappingRule[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
    company_id: 'c1',
    rule_type: 'invitation',
    match_key: 'DEFAULT',
    debit_account: '65900001',
    credit_account: null,
    vat_account: null,
    priority: 100,
    active: true,
  },
]

describe('mapping', () => {
  it('resuelve cuenta de ventas por tipo de IVA', () => {
    expect(resolveSalesAccount(rules, 21)).toBe('70000001')
  })

  it('resuelve cuenta de IVA repercutido', () => {
    expect(resolveVatOutAccount(rules, 21)).toBe('47700001')
  })

  it('resuelve cuenta de pago', () => {
    expect(resolvePaymentAccount(rules, 'EFECTIVO')).toBe('57000001')
  })

  it('resuelve cuenta de invitación', () => {
    expect(resolveInvitationAccount(rules)).toBe('65900001')
  })

  it('falla si no encuentra regla', () => {
    expect(() => resolveSalesAccount(rules, 4)).toThrow()
  })
})

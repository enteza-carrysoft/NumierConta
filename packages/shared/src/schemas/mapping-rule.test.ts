import { describe, it, expect } from 'vitest'
import { MappingRuleSchema, MappingRuleUpdateSchema } from './mapping-rule'

describe('MappingRuleSchema', () => {
  it('accepts a valid rule', () => {
    const result = MappingRuleSchema.safeParse({
      rule_type: 'payment_method',
      match_key: 'TARJETA',
      debit_account: '57200001',
      credit_account: '70000001',
      priority: 10,
      active: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing match_key', () => {
    const result = MappingRuleSchema.safeParse({
      rule_type: 'payment_method',
      debit_account: '57200001',
      credit_account: '70000001',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid rule_type', () => {
    const result = MappingRuleSchema.safeParse({
      rule_type: 'invalid_type',
      match_key: 'X',
      debit_account: '57200001',
      credit_account: '70000001',
    })
    expect(result.success).toBe(false)
  })
})

describe('MappingRuleUpdateSchema', () => {
  it('accepts partial updates', () => {
    const result = MappingRuleUpdateSchema.safeParse({ active: false })
    expect(result.success).toBe(true)
  })
})

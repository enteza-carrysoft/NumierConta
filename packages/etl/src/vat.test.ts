import { describe, it, expect } from 'vitest'
import { calculateVat } from './vat'

describe('calculateVat', () => {
  it('calcula base y cuota para IVA 21%', () => {
    const result = calculateVat(121, 21)
    expect(result.base).toBe(100)
    expect(result.quota).toBe(21)
  })

  it('calcula base y cuota para IVA 10%', () => {
    const result = calculateVat(110, 10)
    expect(result.base).toBe(100)
    expect(result.quota).toBe(10)
  })

  it('mantiene importes sin IVA', () => {
    const result = calculateVat(100, 0)
    expect(result.base).toBe(100)
    expect(result.quota).toBe(0)
  })
})

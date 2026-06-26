import { describe, it, expect } from 'vitest'
import { calculateBalance, adjustRounding } from './balance'
import type { EntryLineDraft } from '@numierconta/shared'

describe('calculateBalance', () => {
  it('detecta asiento cuadrado', () => {
    const lines: EntryLineDraft[] = [
      { account_code: '570', debit: 100, credit: 0 },
      { account_code: '700', debit: 0, credit: 100 },
    ]
    const result = calculateBalance(lines)
    expect(result.balanced).toBe(true)
    expect(result.difference).toBe(0)
  })

  it('detecta diferencia dentro de tolerancia de redondeo', () => {
    const lines: EntryLineDraft[] = [
      { account_code: '570', debit: 100.01, credit: 0 },
      { account_code: '700', debit: 0, credit: 100 },
    ]
    const result = calculateBalance(lines)
    expect(result.balanced).toBe(true)
    expect(result.difference).toBe(0.01)
  })

  it('marca no cuadrado si la diferencia supera tolerancia', () => {
    const lines: EntryLineDraft[] = [
      { account_code: '570', debit: 100, credit: 0 },
      { account_code: '700', debit: 0, credit: 90 },
    ]
    const result = calculateBalance(lines)
    expect(result.balanced).toBe(false)
  })
})

describe('adjustRounding', () => {
  it('ajusta la línea de mayor importe', () => {
    const lines: EntryLineDraft[] = [
      { account_code: '570', debit: 100.01, credit: 0 },
      { account_code: '700', debit: 0, credit: 100 },
    ]
    const adjusted = adjustRounding(lines)
    expect(adjusted[0].debit).toBe(100)
    expect(calculateBalance(adjusted).difference).toBe(0)
  })
})

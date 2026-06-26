import { describe, it, expect } from 'vitest'
import { calculateVat, calculateBalance, resolveSalesAccount } from './index'

describe('ETL package exports', () => {
  it('exports core helpers', () => {
    expect(typeof calculateVat).toBe('function')
    expect(typeof calculateBalance).toBe('function')
    expect(typeof resolveSalesAccount).toBe('function')
  })
})

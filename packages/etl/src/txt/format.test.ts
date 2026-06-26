import { describe, it, expect } from 'vitest'
import { padInt, padNum, padStr, fmtDate, padAccount } from './format'

describe('padInt', () => {
  it('formats positive integer right padded with zeros', () => {
    expect(padInt(1, 6)).toBe('000001')
  })

  it('formats negative integer with leading minus', () => {
    expect(padInt(-42, 6)).toBe('-00042')
  })

  it('formats zero', () => {
    expect(padInt(0, 6)).toBe('000000')
  })
})

describe('padNum', () => {
  it('formats positive amount with 2 implicit decimals', () => {
    expect(padNum(12.5, 16)).toBe('0000000000001250')
  })

  it('formats negative amount with leading minus', () => {
    expect(padNum(-12.5, 16)).toBe('-000000000001250')
  })

  it('formats zero', () => {
    expect(padNum(0, 16)).toBe('0000000000000000')
  })
})

describe('padStr', () => {
  it('pads string with spaces on the right', () => {
    expect(padStr('HOLA', 10)).toBe('HOLA      ')
  })

  it('truncates string longer than length', () => {
    expect(padStr('ABCDEFGHIJKLMNOP', 5)).toBe('ABCDE')
  })

  it('handles null/undefined', () => {
    expect(padStr(null, 5)).toBe('     ')
    expect(padStr(undefined, 5)).toBe('     ')
  })
})

describe('fmtDate', () => {
  it('formats date as AAAAMMDD', () => {
    expect(fmtDate(new Date(2026, 5, 15))).toBe('20260615')
  })

  it('formats ISO string', () => {
    expect(fmtDate('2026-06-15T10:00:00.000Z')).toBe('20260615')
  })
})

describe('padAccount', () => {
  it('pads account code with leading zeros', () => {
    expect(padAccount('572', 8)).toBe('00000572')
  })

  it('leaves long code unchanged', () => {
    expect(padAccount('57200001', 8)).toBe('57200001')
  })
})

import { round2 } from './utils'

export interface VatBreakdown {
  gross: number
  base: number
  quota: number
  rate: number
}

export function calculateVat(gross: number, rate: number): VatBreakdown {
  const base = round2(gross / (1 + rate / 100))
  const quota = round2(gross - base)
  return { gross: round2(gross), base, quota, rate }
}

export function sumVatBreakdowns(breakdowns: VatBreakdown[]): VatBreakdown {
  return {
    gross: round2(breakdowns.reduce((sum, b) => sum + b.gross, 0)),
    base: round2(breakdowns.reduce((sum, b) => sum + b.base, 0)),
    quota: round2(breakdowns.reduce((sum, b) => sum + b.quota, 0)),
    rate: breakdowns[0]?.rate ?? 0,
  }
}

import { round2 } from './utils'
import type { EntryLineDraft } from '@numierconta/shared'

const ROUNDING_TOLERANCE = 0.02

export interface BalanceResult {
  totalDebit: number
  totalCredit: number
  difference: number
  balanced: boolean
}

export function calculateBalance(lines: EntryLineDraft[]): BalanceResult {
  const totalDebit = round2(lines.reduce((sum, line) => sum + line.debit, 0))
  const totalCredit = round2(lines.reduce((sum, line) => sum + line.credit, 0))
  const difference = round2(totalDebit - totalCredit)

  return {
    totalDebit,
    totalCredit,
    difference,
    balanced: Math.abs(difference) <= ROUNDING_TOLERANCE,
  }
}

export function adjustRounding(lines: EntryLineDraft[]): EntryLineDraft[] {
  const balance = calculateBalance(lines)

  if (balance.balanced && balance.difference !== 0) {
    const adjustment = -balance.difference
    const targetLine = findLargestLine(lines)

    if (targetLine) {
      if (targetLine.debit > 0) {
        targetLine.debit = round2(targetLine.debit + adjustment)
      } else if (targetLine.credit > 0) {
        targetLine.credit = round2(targetLine.credit + adjustment)
      }
    }
  }

  return lines
}

function findLargestLine(lines: EntryLineDraft[]): EntryLineDraft | undefined {
  return lines.reduce<EntryLineDraft | undefined>((largest, line) => {
    const currentAmount = line.debit + line.credit
    const largestAmount = largest ? largest.debit + largest.credit : 0
    return currentAmount > largestAmount ? line : largest
  }, undefined)
}

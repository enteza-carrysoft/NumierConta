import iconv from 'iconv-lite'
import { buildSubcuentasFile } from './subcuentas'
import { buildDiarioFile } from './diario'
import type { TxtAccount, TxtEntryLine, GeneratedTxtFiles } from './types'

function normalizeForWin1252(value: string): string {
  // Replace characters not representable in Windows-1252 with closest equivalents
  return (
    value
      // common replacements
      .replace(/[€]/g, 'EUR')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—]/g, '-')
      .replace(/[…]/g, '...')
  )
}

export function encodeToWin1252(content: string): Buffer {
  const normalized = normalizeForWin1252(content)
  return iconv.encode(normalized, 'win1252')
}

export interface GenerateTxtInput {
  accountDigits: number
  accounts: TxtAccount[]
  lines: TxtEntryLine[]
}

export function generateTxtFiles(input: GenerateTxtInput): GeneratedTxtFiles {
  const { accountDigits, accounts, lines } = input

  const subcuentasContent = buildSubcuentasFile(accounts, accountDigits)
  const diarioContent = buildDiarioFile(lines, accountDigits)

  return {
    subcuentas: encodeToWin1252(subcuentasContent),
    diario: encodeToWin1252(diarioContent),
  }
}

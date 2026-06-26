import { padInt, padNum, padStr, fmtDate, padAccount } from './format'
import type { TxtEntryLine } from './types'

export function buildDiarioRecord(line: TxtEntryLine, accountDigits: number): string {
  const asien = padInt(line.entryNumber, 6)
  const fecha = fmtDate(line.date)
  const subcta = padStr(padAccount(line.accountCode, accountDigits), 12)
  const reserved1 = padStr('', 28)
  const concepto = padStr(line.concept, 25)
  const reserved2 = padStr('', 50)
  const documento = padStr(line.document ?? '', 10)
  const reserved3 = padStr('', 3)
  const clave = padStr(line.analyticKey ?? '', 6)
  const reserved4 = padStr('', 90)
  const euroDebe = padNum(line.debit, 16)
  const euroHaber = padNum(line.credit, 16)
  const reserved5 = padStr('', 68)
  const rectifica = line.isRectifying ? 'T' : 'F'
  const reserved6 = padStr('', 529)
  const tipoFac = padStr(line.invoiceType ?? '', 1)

  return (
    asien +
    fecha +
    subcta +
    reserved1 +
    concepto +
    reserved2 +
    documento +
    reserved3 +
    clave +
    reserved4 +
    euroDebe +
    euroHaber +
    reserved5 +
    rectifica +
    reserved6 +
    tipoFac
  )
}

export function buildDiarioFile(lines: TxtEntryLine[], accountDigits: number): string {
  return lines.map((line) => buildDiarioRecord(line, accountDigits)).join('\r\n')
}

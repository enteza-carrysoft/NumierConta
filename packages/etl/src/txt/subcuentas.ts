import { padStr, padNum, padAccount } from './format'
import type { TxtAccount } from './types'

export function buildSubcuentasRecord(account: TxtAccount, accountDigits: number): string {
  const code = padStr(padAccount(account.code, accountDigits), 12)
  const title = padStr(account.title, 40)
  const nif = padStr(account.nif ?? '', 15)
  const address = padStr(account.address ?? '', 35)
  const city = padStr(account.city ?? '', 25)
  const province = padStr(account.province ?? '', 20)
  const postalCode = padStr(account.postalCode ?? '', 5)
  const reserved1 = padStr('', 8)
  const vatType = padStr(account.vatType ?? '', 1)
  const reserved2 = padStr('', 46)
  const tpc = padNum(account.vatRate ?? 0, 5)
  const recEquiv = padNum(account.surchargeRate ?? 0, 5)
  const fax = padStr('', 15)
  const email = padStr('', 50)
  const reserved3 = padStr('', 100)
  const idNif = (account.nif ? '1' : '0').padStart(1, '0')
  const countryCode = padStr(account.countryCode ?? '', 2)
  const rep14Nif = padStr('', 9)
  const reserved4 = padStr('', 45)
  const irpf = padNum(account.irpfRate ?? 0, 5)

  return (
    code +
    title +
    nif +
    address +
    city +
    province +
    postalCode +
    reserved1 +
    vatType +
    reserved2 +
    tpc +
    recEquiv +
    fax +
    email +
    reserved3 +
    idNif +
    countryCode +
    rep14Nif +
    reserved4 +
    irpf
  )
}

export function buildSubcuentasFile(accounts: TxtAccount[], accountDigits: number): string {
  return accounts
    .map((account) => buildSubcuentasRecord(account, accountDigits))
    .join('\r\n')
}

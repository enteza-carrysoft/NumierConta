export function padInt(value: number, len: number): string {
  const neg = value < 0
  const abs = Math.abs(value)
  const s = abs.toString().padStart(len - (neg ? 1 : 0), '0')
  return (neg ? '-' : '') + s
}

export function padNum(value: number, len: number): string {
  const cents = Math.round(value * 100)
  const neg = cents < 0
  const abs = Math.abs(cents)
  const targetLen = len - (neg ? 1 : 0)
  const s = abs.toString().padStart(targetLen, '0')
  return (neg ? '-' : '') + s
}

export function padStr(value: string | null | undefined, len: number): string {
  const safe = (value ?? '').toString().slice(0, len)
  return safe.padEnd(len, ' ')
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export function padAccount(code: string, digits: number): string {
  return code.padStart(digits, '0')
}

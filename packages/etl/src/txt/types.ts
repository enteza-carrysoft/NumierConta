export interface TxtAccount {
  code: string
  title: string
  nif?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  vatType?: string | null
  vatRate?: number | null
  surchargeRate?: number | null
  countryCode?: string | null
  irpfRate?: number | null
}

export interface TxtEntryLine {
  entryNumber: number
  date: string
  accountCode: string
  concept: string
  debit: number
  credit: number
  document?: string | null
  analyticKey?: string | null
  isRectifying?: boolean
  invoiceType?: 'E' | 'R' | null
}

export interface GeneratedTxtFiles {
  subcuentas: Buffer
  diario: Buffer
}

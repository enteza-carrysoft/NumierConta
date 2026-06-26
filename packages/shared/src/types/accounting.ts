// Tipos del dominio contable — mapa de cuentas, asientos y apuntes.
// Reflejan las tablas de las secciones 3.2 y 3.4 del documento de diseño.
// El motor ETL (packages/etl) consume y produce estos tipos.

export type AccountClass =
  | 'sales'
  | 'vat_out'
  | 'vat_in'
  | 'cash'
  | 'bank'
  | 'expense'
  | 'customer'
  | 'supplier'
  | 'invitation'

export interface Account {
  id: string
  company_id: string
  code: string
  title: string
  nif: string | null
  vat_type: string | null
  vat_rate: number | null
  surcharge_rate: number | null
  account_class: string | null
}

export interface MappingRule {
  id: string
  company_id: string
  rule_type: string
  match_key: string | null
  debit_account: string | null
  credit_account: string | null
  vat_account: string | null
  priority: number | null
  active: boolean | null
}

export type EntrySourceType = 'closure' | 'expense' | 'invoice'
export type VatInvoiceType = 'E' | 'R'

export interface EntryLineDraft {
  account_code: string
  concept?: string
  debit: number
  credit: number
  vat_invoice_type?: VatInvoiceType
  is_rectification?: boolean
}

export interface EntryDraft {
  entry_number?: number
  entry_date: string // ISO date
  concept: string
  doc_number?: string
  source_type: EntrySourceType
  source_ref: string
  lines: EntryLineDraft[]
  balanced: boolean
}

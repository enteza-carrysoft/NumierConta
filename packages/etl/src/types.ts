import type { Account, MappingRule } from '@numierconta/shared'

export interface StgClosure {
  id?: string
  company_id: string
  numier_fec_id: number
  opened_at: string | null
  closed_at: string | null
  total_cash: number | null
  total_card: number | null
  total_sales: number | null
  change_kept: number | null
  withdrawals: number | null
}

export interface StgTicketHead {
  id?: string
  company_id: string
  numier_cab_id: number
  ticket_date: string
  ticket_time: string | null
  operator_code: string | null
  state: string | null
  payment_main: string | null
  amount_card: number | null
  amount_check: number | null
  invoice_number: string | null
  customer_nif: string | null
  doc_number: string | null
  numier_cli_id: number | null
  total: number | null
  closure_fec_id: number | null
}

export interface StgTicketLine {
  id?: string
  company_id: string
  numier_cab_id: number
  line_seq: number | null
  article_code: string | null
  qty: number | null
  unit_price: number | null
  line_amount: number | null
  vat_rate: number | null
  description: string | null
}

export interface StgExpenseHead {
  id?: string
  company_id: string
  numier_gac_id: number
  expense_date: string
  supplier_id: number | null
  total: number | null
  from_cash: boolean | null
  invoice_ref: string | null
}

export interface StgExpenseLine {
  id?: string
  company_id: string
  numier_gac_id: number
  line_seq: number | null
  amount: number | null
  total: number | null
  vat_rate: number | null
}

export interface StgCustomer {
  company_id: string
  numier_cli_id: number
  nif: string | null
  name: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  province: string | null
}

export interface StgSupplier {
  company_id: string
  numier_con_id: number
  nif: string | null
  name: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  category_id: number | null
}

export interface EtlInput {
  companyId: string
  periodFrom: string
  periodTo: string
  closures: StgClosure[]
  ticketHeads: StgTicketHead[]
  ticketLines: StgTicketLine[]
  expenseHeads: StgExpenseHead[]
  expenseLines: StgExpenseLine[]
  customers: StgCustomer[]
  suppliers: StgSupplier[]
  accounts: Account[]
  mappingRules: MappingRule[]
}

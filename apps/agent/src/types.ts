export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AgentConfig {
  numierDataPath: string
  apiBaseUrl: string
  agentApiKey: string
  pollSeconds: number
  masterSyncSeconds: number
  logLevel: LogLevel
  stateFilePath: string
}

export interface SyncState {
  lastFecId: number
  lastMasterSyncAt: string | null
}

export interface RawClosure {
  numier_fec_id: number
  opened_at: string
  closed_at: string | null
  total_sales: number
  total_payments: Record<string, number>
  source_file: string
}

export interface RawTicketHead {
  numier_ticket_id: string
  closure_fec_id: number
  issued_at: string
  total: number
  customer_ref: string | null
  source_file: string
}

export interface RawTicketLine {
  numier_ticket_id: string
  line_number: number
  item_ref: string
  description: string
  quantity: number
  unit_price: number
  line_amount: number
  vat_rate: number
  source_file: string
}

export interface RawExpenseHead {
  numier_expense_id: string
  issued_at: string
  supplier_ref: string | null
  description: string | null
  total: number
  paid: boolean
  source_file: string
}

export interface RawExpenseLine {
  numier_expense_id: string
  line_number: number
  description: string
  amount: number
  vat_rate: number
  source_file: string
}

export interface RawMaster {
  code: string
  name: string
  tax_id: string | null
  address: string | null
  source_file: string
}

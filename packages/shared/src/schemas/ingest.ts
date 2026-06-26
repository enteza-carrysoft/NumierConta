import { z } from 'zod'
import { TicketStateSchema } from './common'

// ── /api/ingest/closures (stg_closures, fechas.DBF) ─────────────────────────

export const ClosureSchema = z.object({
  numier_fec_id: z.number().int(),
  opened_at: z.string().datetime().nullable().optional(),
  closed_at: z.string().datetime().nullable().optional(),
  total_cash: z.number().optional(),
  total_card: z.number().optional(),
  total_sales: z.number().optional(),
  change_kept: z.number().optional(),
  withdrawals: z.number().optional(),
})
export type Closure = z.infer<typeof ClosureSchema>

export const IngestClosuresPayloadSchema = z.object({
  closures: z.array(ClosureSchema).min(1),
})
export type IngestClosuresPayload = z.infer<typeof IngestClosuresPayloadSchema>

// ── /api/ingest/tickets (stg_ticket_head + stg_ticket_lines) ────────────────

export const TicketHeadSchema = z.object({
  numier_cab_id: z.number().int(),
  ticket_date: z.string().date(),
  ticket_time: z.string().nullable().optional(),
  operator_code: z.string().nullable().optional(),
  state: TicketStateSchema,
  payment_main: z.string().length(1).nullable().optional(),
  amount_card: z.number().default(0),
  amount_check: z.number().default(0),
  invoice_number: z.string().nullable().optional(),
  customer_nif: z.string().nullable().optional(),
  doc_number: z.string().nullable().optional(),
  numier_cli_id: z.number().int().nullable().optional(),
  total: z.number(),
  closure_fec_id: z.number().int().nullable().optional(),
})
export type TicketHead = z.infer<typeof TicketHeadSchema>

export const TicketLineSchema = z.object({
  numier_cab_id: z.number().int(),
  line_seq: z.number().int(),
  article_code: z.string().nullable().optional(),
  qty: z.number(),
  unit_price: z.number(),
  line_amount: z.number(),
  vat_rate: z.number(),
  description: z.string().nullable().optional(),
})
export type TicketLine = z.infer<typeof TicketLineSchema>

export const IngestTicketsPayloadSchema = z.object({
  heads: z.array(TicketHeadSchema).min(1),
  lines: z.array(TicketLineSchema).min(1),
})
export type IngestTicketsPayload = z.infer<typeof IngestTicketsPayloadSchema>

// ── /api/ingest/expenses (stg_expense_head + stg_expense_lines) ─────────────

export const ExpenseHeadSchema = z.object({
  numier_gac_id: z.number().int(),
  expense_date: z.string().date(),
  supplier_id: z.number().int().nullable().optional(),
  total: z.number(),
  from_cash: z.boolean().default(false),
  invoice_ref: z.string().nullable().optional(),
})
export type ExpenseHead = z.infer<typeof ExpenseHeadSchema>

export const ExpenseLineSchema = z.object({
  numier_gac_id: z.number().int(),
  line_seq: z.number().int(),
  amount: z.number(),
  total: z.number(),
  vat_rate: z.number(),
})
export type ExpenseLine = z.infer<typeof ExpenseLineSchema>

export const IngestExpensesPayloadSchema = z.object({
  heads: z.array(ExpenseHeadSchema).min(1),
  lines: z.array(ExpenseLineSchema).min(1),
})
export type IngestExpensesPayload = z.infer<typeof IngestExpensesPayloadSchema>

// ── /api/ingest/masters (stg_customers + stg_suppliers) ─────────────────────

export const CustomerSchema = z.object({
  numier_cli_id: z.number().int(),
  nif: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
})
export type Customer = z.infer<typeof CustomerSchema>

export const SupplierSchema = z.object({
  numier_con_id: z.number().int(),
  nif: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  category_id: z.number().int().nullable().optional(),
})
export type Supplier = z.infer<typeof SupplierSchema>

export const IngestMastersPayloadSchema = z.object({
  customers: z.array(CustomerSchema).optional().default([]),
  suppliers: z.array(SupplierSchema).optional().default([]),
})
export type IngestMastersPayload = z.infer<typeof IngestMastersPayloadSchema>

// ── /api/agent/state ─────────────────────────────────────────────────────────

export const AgentStateSchema = z.object({
  last_fec_id: z.number().int().nonnegative(),
})
export type AgentState = z.infer<typeof AgentStateSchema>

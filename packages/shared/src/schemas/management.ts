import { z } from 'zod'

// ── POST /api/etl/run ────────────────────────────────────────────────────

export const EtlRunPayloadSchema = z.object({
  company_id: z.string().uuid(),
  period_from: z.string().date(),
  period_to: z.string().date(),
})
export type EtlRunPayload = z.infer<typeof EtlRunPayloadSchema>

// ── PATCH /api/batches/:id ──────────────────────────────────────────────────

export const BatchStatusSchema = z.enum(['draft', 'reviewed', 'exported', 'imported'])
export type BatchStatus = z.infer<typeof BatchStatusSchema>

export const PatchBatchPayloadSchema = z.object({
  status: BatchStatusSchema,
})
export type PatchBatchPayload = z.infer<typeof PatchBatchPayloadSchema>

// ── GET /api/dashboard ───────────────────────────────────────────────────────

export const DashboardQuerySchema = z.object({
  company_id: z.string().uuid(),
  from: z.string().date(),
  to: z.string().date(),
})
export type DashboardQuery = z.infer<typeof DashboardQuerySchema>

export const DashboardKpisSchema = z.object({
  total_sales: z.number(),
  average_ticket: z.number(),
  sales_by_vat: z.array(z.object({ vat_rate: z.number(), base: z.number(), quota: z.number() })),
  sales_by_hour: z.array(z.object({ hour: z.number().int().min(0).max(23), total: z.number() })),
  top_products: z.array(z.object({ article_code: z.string(), total: z.number() })),
  total_expenses: z.number(),
  gross_operating_margin: z.number(),
  payments: z.object({ cash: z.number(), card: z.number() }),
})
export type DashboardKpis = z.infer<typeof DashboardKpisSchema>

import { z } from 'zod'

// Estados de ticket (CAB_ESTADO) — sección 8 del documento de diseño
export const TicketStateSchema = z.enum(['C', 'P', 'N', 'X', 'G', 'I'])
export type TicketState = z.infer<typeof TicketStateSchema>

// Respuesta estándar de los endpoints /api/ingest/* (sección 5.1)
export const IngestResultSchema = z.object({
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
})
export type IngestResult = z.infer<typeof IngestResultSchema>

// Forma estándar de error de la API
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

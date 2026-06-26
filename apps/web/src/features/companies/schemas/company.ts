import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120),
  cif: z.string().max(20).optional(),
  classiccontaDigits: z.coerce.number().int().min(6).max(12).default(8),
  fiscalYear: z.coerce.number().int().optional(),
})

export type CompanyFormData = z.infer<typeof companySchema>

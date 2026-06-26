import { z } from 'zod'

export const accountSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(120),
  nif: z.string().max(20).optional(),
  vatType: z.enum(['G', 'N', 'I', 'P', 'J', 'T']).optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  surchargeRate: z.coerce.number().min(0).max(100).optional(),
  accountClass: z
    .enum([
      'sales',
      'vat_out',
      'vat_in',
      'cash',
      'bank',
      'expense',
      'customer',
      'supplier',
      'invitation',
    ])
    .optional(),
})

export type AccountFormData = z.infer<typeof accountSchema>

import { z } from 'zod'

export const MappingRuleTypeSchema = z.enum([
  'sales_by_vat',
  'payment_method',
  'expense_category',
  'invitation',
])

export const MappingRuleSchema = z.object({
  rule_type: MappingRuleTypeSchema,
  match_key: z.string().min(1, 'La clave de coincidencia es obligatoria'),
  debit_account: z.string().min(1, 'La cuenta deudora es obligatoria').max(12),
  credit_account: z.string().min(1, 'La cuenta acreedora es obligatoria').max(12),
  vat_account: z.string().max(12).optional(),
  priority: z.number().int().min(0).max(9999).default(100),
  active: z.boolean().default(true),
})

export const MappingRuleUpdateSchema = MappingRuleSchema.partial()

export const MappingRuleRowSchema = MappingRuleSchema.extend({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
})

export type MappingRule = z.infer<typeof MappingRuleRowSchema>
export type MappingRuleInput = z.infer<typeof MappingRuleSchema>
export type MappingRuleUpdateInput = z.infer<typeof MappingRuleUpdateSchema>

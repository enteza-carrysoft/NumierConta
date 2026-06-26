import { z } from 'zod'

export const OnboardingSchema = z.object({
  organizationName: z.string().min(2, 'El nombre de la organización es obligatorio'),
  companyName: z.string().min(2, 'El nombre de la empresa es obligatorio'),
  cif: z.string().optional(),
})

export type OnboardingInput = z.infer<typeof OnboardingSchema>

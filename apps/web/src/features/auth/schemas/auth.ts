import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const SignupSchema = z
  .object({
    email: z.string().email('Introduce un email válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof SignupSchema>

import { SignupForm } from '@/features/auth/components/signup-form'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold">Crear cuenta</h1>
          <p className="mt-2 text-gray-600">Empieza a usar NumierConta Gateway</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}

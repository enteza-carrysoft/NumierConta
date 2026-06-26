import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold">Iniciar sesión</h1>
          <p className="mt-2 text-gray-600">Accede a tu cuenta de NumierConta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

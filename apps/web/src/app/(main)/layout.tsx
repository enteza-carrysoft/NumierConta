import { redirect } from 'next/navigation'
import { getUserContext } from '@/features/auth/services/get-user-context'
import { LogoutButton } from '@/features/auth/components/logout-button'
import { CompanySelector } from '@/features/auth/components/company-selector'
import { Sidebar } from '@/shared/components/sidebar'
import { MobileMenu } from '@/shared/components/mobile-menu'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await getUserContext()

  if (!context.authenticated) {
    redirect('/login')
  }

  if (!context.onboarded) {
    redirect('/onboarding')
  }

  const { user, company, companies, organization } = context

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <header className="border-b bg-white">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 md:hidden">
              <MobileMenu />
              <span className="text-lg font-bold text-indigo-600">NumierConta</span>
            </div>

            <div className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
              <span>{organization?.name}</span>
              <span className="text-gray-300">/</span>
              <CompanySelector companies={companies} activeCompanyId={company?.id} />
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-gray-600 md:inline">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

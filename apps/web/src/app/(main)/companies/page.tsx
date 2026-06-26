import { listCompanies } from '@/features/companies/services/list-companies'
import { createCompany } from '@/features/companies/services/create-company'
import { updateCompany } from '@/features/companies/services/update-company'
import { CompaniesList } from '@/features/companies/components/companies-list'
import { CompanyForm } from '@/features/companies/components/company-form'
import { Card } from '@/shared/components/ui/card'

export default async function CompaniesPage() {
  const companies = await listCompanies()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Empresas</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompaniesList companies={companies} updateAction={updateCompany} />

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nueva empresa</h2>
          <CompanyForm action={createCompany} />
        </Card>
      </div>
    </div>
  )
}

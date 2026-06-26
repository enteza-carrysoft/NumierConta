'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { CompanyForm } from './company-form'
import type { Company } from '@/features/companies/services/list-companies'
import type { UpdateCompanyState } from '@/features/companies/services/update-company'

interface CompaniesListProps {
  companies: Company[]
  updateAction: (prevState: UpdateCompanyState, formData: FormData) => Promise<UpdateCompanyState>
}

export function CompaniesList({ companies, updateAction }: CompaniesListProps) {
  const [editing, setEditing] = useState<string | null>(null)

  if (companies.length === 0) {
    return <p className="text-gray-600">No tienes empresas todavía.</p>
  }

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <Card key={company.id}>
          {editing === company.id ? (
            <CompanyForm company={company} action={updateAction} />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                <p className="text-sm text-gray-600">CIF: {company.cif ?? '—'}</p>
                <p className="text-sm text-gray-600">
                  Dígitos: {company.classiccontaDigits} | Ejercicio: {company.fiscalYear ?? '—'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(company.id)}>
                Editar
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

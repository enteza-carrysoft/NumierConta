'use client'

import { setActiveCompany } from '@/features/auth/services/set-active-company'

interface Company {
  id: string
  name: string
}

interface CompanySelectorProps {
  companies: Company[]
  activeCompanyId?: string
}

export function CompanySelector({ companies, activeCompanyId }: CompanySelectorProps) {
  if (companies.length <= 1) {
    return (
      <span className="text-sm font-medium text-gray-900">
        {companies[0]?.name ?? 'Sin empresa'}
      </span>
    )
  }

  return (
    <select
      defaultValue={activeCompanyId}
      onChange={(e) => setActiveCompany(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  )
}

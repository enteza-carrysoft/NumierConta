import { listMappingRules } from '@/features/mapping/services/list-rules'
import {
  createMappingRuleAction,
  updateMappingRuleAction,
  deleteMappingRuleAction,
} from '@/features/mapping/services/form-actions'
import { MappingList } from '@/features/mapping/components/mapping-list'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'

export default async function MappingPage() {
  const company = await getCurrentCompany()
  const rules = company ? await listMappingRules(company.companyId) : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Mapeo de cuentas</h1>
      {company ? (
        <MappingList
          companyId={company.companyId}
          rules={rules}
          createAction={createMappingRuleAction}
          updateAction={updateMappingRuleAction}
          deleteAction={deleteMappingRuleAction}
        />
      ) : (
        <p className="text-gray-600">Selecciona una empresa activa para gestionar el mapeo.</p>
      )}
    </div>
  )
}

import { EtlRunPayloadSchema } from '@numierconta/shared'
import { runEtl } from '@numierconta/etl'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateUser, authorizeCompany, companyForbidden } from '../../_lib/auth-user'
import {
  badRequest,
  internalError,
  successResponse,
} from '../../_lib/respond'
import { persistBatch } from '../../_lib/persist-batch'

export async function POST(request: Request) {
  const auth = await authenticateUser(request)
  if (!auth.success) {
    return auth.response
  }

  const body = await request.json()
  const parsed = EtlRunPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return badRequest(parsed.error.message)
  }

  const { company_id, period_from, period_to } = parsed.data

  const hasAccess = await authorizeCompany(auth.userId, company_id)
  if (!hasAccess) {
    return companyForbidden()
  }

  try {
    const input = await loadEtlInput(company_id, period_from, period_to)
    const result = runEtl(input)

    const processedClosureIds = input.closures
      .filter((closure) => closure.closed_at !== null)
      .map((closure) => closure.numier_fec_id)

    const processedExpenseIds = input.expenseHeads.map(
      (expense) => expense.numier_gac_id
    )

    const batchId = await persistBatch({
      companyId: company_id,
      userId: auth.userId,
      periodFrom: period_from,
      periodTo: period_to,
      entries: result.entries,
      processedClosureIds,
      processedExpenseIds,
    })

    return successResponse({ batch_id: batchId })
  } catch (error) {
    console.error('Error running ETL:', error)
    return internalError('Failed to run ETL')
  }
}

async function loadEtlInput(
  companyId: string,
  periodFrom: string,
  periodTo: string
) {
  const supabase = createServiceRoleClient()

  const [closures, ticketHeads, ticketLines, expenseHeads, expenseLines, customers, suppliers, accounts, mappingRules] =
    await Promise.all([
      supabase.from('stg_closures').select('*').eq('company_id', companyId),
      supabase.from('stg_ticket_head').select('*').eq('company_id', companyId),
      supabase.from('stg_ticket_lines').select('*').eq('company_id', companyId),
      supabase.from('stg_expense_head').select('*').eq('company_id', companyId),
      supabase.from('stg_expense_lines').select('*').eq('company_id', companyId),
      supabase.from('stg_customers').select('*').eq('company_id', companyId),
      supabase.from('stg_suppliers').select('*').eq('company_id', companyId),
      supabase.from('accounts').select('*').eq('company_id', companyId),
      supabase.from('mapping_rules').select('*').eq('company_id', companyId),
    ])

  if (
    closures.error ||
    ticketHeads.error ||
    ticketLines.error ||
    expenseHeads.error ||
    expenseLines.error ||
    customers.error ||
    suppliers.error ||
    accounts.error ||
    mappingRules.error
  ) {
    throw new Error('Failed to load ETL input data')
  }

  return {
    companyId,
    periodFrom,
    periodTo,
    closures: closures.data ?? [],
    ticketHeads: ticketHeads.data ?? [],
    ticketLines: ticketLines.data ?? [],
    expenseHeads: expenseHeads.data ?? [],
    expenseLines: expenseLines.data ?? [],
    customers: customers.data ?? [],
    suppliers: suppliers.data ?? [],
    accounts: accounts.data ?? [],
    mappingRules: mappingRules.data ?? [],
  }
}

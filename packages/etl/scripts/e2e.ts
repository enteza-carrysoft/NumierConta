import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { runEtl } from '../src/run-etl'
import type { EtlInput } from '../src/types'

config({ path: '../../apps/web/.env.local' })

const companyId = '129afd20-782b-46b7-bffa-6c64e680ed20'
const periodFrom = '2026-06-14'
const periodTo = '2026-06-15'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  const supabase = createClient(url, key)

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
    throw new Error('Failed to load data from Supabase')
  }

  const input: EtlInput = {
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

  const result = runEtl(input)

  console.log(`Generated ${result.entries.length} entries`)

  let allBalanced = true
  for (const entry of result.entries) {
    const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0)
    const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0)
    const balanced = Math.abs(debit - credit) < 0.001

    console.log(
      `Entry #${entry.entry_number} (${entry.source_type} ${entry.source_ref}): debit=${debit.toFixed(2)} credit=${credit.toFixed(2)} balanced=${balanced}`
    )

    if (!balanced) {
      allBalanced = false
    }
  }

  if (!allBalanced) {
    throw new Error('Some entries are not balanced')
  }

  console.log('E2E validation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

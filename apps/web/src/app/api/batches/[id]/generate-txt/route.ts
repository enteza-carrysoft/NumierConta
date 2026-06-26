import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'
import { generateTxtFiles } from '@numierconta/etl/txt/generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()

  try {
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, status, company_id')
      .eq('id', id)
      .eq('company_id', company.companyId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const { data: entries } = await supabase
      .from('entries')
      .select('id, entry_number, date, description')
      .eq('batch_id', id)
      .order('entry_number', { ascending: true })

    const entryIds = (entries ?? []).map((e) => e.id)

    const { data: entryLines } =
      entryIds.length > 0
        ? await supabase
            .from('entry_lines')
            .select('entry_id, account_code, concept, debit, credit')
            .in('entry_id', entryIds)
            .order('id', { ascending: true })
        : { data: [] }

    const { data: accounts } = await supabase
      .from('accounts')
      .select('code, title, nif, vat_type, vat_rate, surcharge_rate')
      .eq('company_id', company.companyId)

    const { data: companyConfig } = await supabase
      .from('companies')
      .select('classicconta_digits')
      .eq('id', company.companyId)
      .single()

    const accountDigits = companyConfig?.classicconta_digits ?? 8

    const lines = (entryLines ?? []).map((line) => {
      const entry = entries?.find((e) => e.id === line.entry_id)
      return {
        entryNumber: entry?.entry_number ?? 0,
        date: entry?.date ?? new Date().toISOString(),
        accountCode: line.account_code,
        concept: line.concept,
        debit: line.debit,
        credit: line.credit,
      }
    })

    const referencedAccountCodes = new Set(lines.map((l) => l.accountCode))
    const subcuentasAccounts = (accounts ?? []).filter((a) => referencedAccountCodes.has(a.code))

    const files = generateTxtFiles({
      accountDigits,
      accounts: subcuentasAccounts.map((a) => ({
        code: a.code,
        title: a.title,
        nif: a.nif,
        vatType: a.vat_type,
        vatRate: a.vat_rate ? Number(a.vat_rate) : null,
        surchargeRate: a.surcharge_rate ? Number(a.surcharge_rate) : null,
      })),
      lines,
    })

    return NextResponse.json({
      subcuentas: files.subcuentas.toString('base64'),
      diario: files.diario.toString('base64'),
      filenames: {
        subcuentas: 'SUBCUENTAS.TXT',
        diario: 'DIARIO.TXT',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'
import { listMappingRules } from '@/features/mapping/services/list-rules'
import { createMappingRule } from '@/features/mapping/services/create-rule'
import { MappingRuleSchema } from '@numierconta/shared/schemas/mapping-rule'

export async function GET(): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rules = await listMappingRules(company.companyId)
    return NextResponse.json({ rules })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = MappingRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const rule = await createMappingRule(company.companyId, parsed.data)
    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

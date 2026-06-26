import { NextResponse } from 'next/server'
import { getCurrentCompany } from '@/features/auth/services/get-current-company'
import { updateMappingRule } from '@/features/mapping/services/update-rule'
import { deleteMappingRule } from '@/features/mapping/services/delete-rule'
import { MappingRuleUpdateSchema } from '@numierconta/shared/schemas/mapping-rule'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteParams): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = MappingRuleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const rule = await updateMappingRule(company.companyId, id, parsed.data)
    return NextResponse.json({ rule })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  const company = await getCurrentCompany()
  if (!company) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteMappingRule(company.companyId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

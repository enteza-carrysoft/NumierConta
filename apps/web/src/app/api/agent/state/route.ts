import { AgentStateSchema } from '@numierconta/shared'
import { authenticateAgent } from '../../_lib/auth-agent'
import {
  internalError,
  successResponse,
} from '../../_lib/respond'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: Request) {
  const auth = await authenticateAgent(request)
  if (!auth.success) {
    return auth.response
  }

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('stg_closures')
      .select('numier_fec_id')
      .eq('company_id', auth.companyId)
      .order('numier_fec_id', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch agent state: ${error.message}`)
    }

    const last_fec_id = data?.numier_fec_id ?? 0
    const state = AgentStateSchema.parse({ last_fec_id })

    return successResponse(state)
  } catch (error) {
    console.error('Error fetching agent state:', error)
    return internalError('Failed to fetch agent state')
  }
}

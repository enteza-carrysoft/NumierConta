import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { unauthorized } from './respond'
import type { NextResponse } from 'next/server'

const AGENT_KEY_HEADER = 'x-agent-key'

export type AgentAuthResult =
  | { success: true; companyId: string }
  | { success: false; response: NextResponse }

export async function authenticateAgent(
  request: Request
): Promise<AgentAuthResult> {
  const key = request.headers.get(AGENT_KEY_HEADER)

  if (!key) {
    return { success: false, response: unauthorized('Missing X-Agent-Key header') }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('agent_api_key', key)
    .single()

  if (error || !data) {
    return { success: false, response: unauthorized() }
  }

  return { success: true, companyId: data.id }
}

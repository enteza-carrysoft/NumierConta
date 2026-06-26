import type { HttpClient } from './client'

export interface AgentState {
  last_fec_id: number
}

export async function fetchAgentState(client: HttpClient): Promise<AgentState> {
  const response = await client.get<AgentState>('/api/agent/state')

  if (response.status !== 200) {
    throw new Error(`Failed to fetch agent state: HTTP ${response.status}`)
  }

  if (typeof response.body !== 'object' || response.body === null) {
    throw new Error('Invalid agent state response')
  }

  const body = response.body as AgentState

  if (typeof body.last_fec_id !== 'number') {
    throw new Error('Missing last_fec_id in agent state response')
  }

  return { last_fec_id: body.last_fec_id }
}

import { describe, it, expect } from 'vitest'
import { fetchAgentState } from './state'
import type { HttpClient, ApiResponse } from './client'

function createMockClient(response: ApiResponse<unknown>): HttpClient {
  return {
    get: async <T>() => response as ApiResponse<T>,
    post: async <T>() => ({ status: 200, body: {} as T }),
  }
}

describe('fetchAgentState', () => {
  it('returns last_fec_id on success', async () => {
    const client = createMockClient({ status: 200, body: { last_fec_id: 42 } })
    const state = await fetchAgentState(client)
    expect(state.last_fec_id).toBe(42)
  })

  it('throws on non-200 status', async () => {
    const client = createMockClient({ status: 500, body: { error: 'boom' } })
    await expect(fetchAgentState(client)).rejects.toThrow('Failed to fetch agent state')
  })

  it('throws if last_fec_id is missing', async () => {
    const client = createMockClient({ status: 200, body: {} })
    await expect(fetchAgentState(client)).rejects.toThrow('Missing last_fec_id')
  })
})

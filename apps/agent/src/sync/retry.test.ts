import { describe, it, expect } from 'vitest'
import { withRetry } from './retry'

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const result = await withRetry(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('retries until success', async () => {
    let attempts = 0
    const result = await withRetry(
      async () => {
        attempts += 1
        if (attempts < 3) throw new Error('fail')
        return 'ok'
      },
      { baseDelayMs: 10 }
    )
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('throws after max attempts', async () => {
    await expect(
      withRetry(async () => {
        throw new Error('always fails')
      }, { maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toThrow('always fails')
  })
})

import { describe, it, expect } from 'vitest'
import { readClosures } from './closures'
import { createMockExecutor } from './connection'

describe('readClosures', () => {
  it('filters and maps DBF rows', async () => {
    const executor = createMockExecutor({
      'from fechas': [
        {
          FEC_ID: 10,
          FEC_INICIO: new Date('2026-06-15T08:00:00Z'),
          FEC_FIN: new Date('2026-06-15T23:00:00Z'),
          TOTAL_VENTAS: 1250.5,
          TOTAL_TARJETA: 800,
          TOTAL_EFECTIVO: 450.5,
        },
      ],
    })

    const closures = await readClosures(executor, 5)

    expect(closures).toHaveLength(1)
    expect(closures[0].numier_fec_id).toBe(10)
    expect(closures[0].total_sales).toBe(1250.5)
    expect(closures[0].total_payments).toEqual({
      tarjeta: 800,
      efectivo: 450.5,
    })
  })

  it('returns empty array when no rows match', async () => {
    const executor = createMockExecutor({ 'from fechas': [] })
    const closures = await readClosures(executor, 99)
    expect(closures).toHaveLength(0)
  })
})

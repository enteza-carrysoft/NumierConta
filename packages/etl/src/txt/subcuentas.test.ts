import { describe, it, expect } from 'vitest'
import { buildSubcuentasRecord, buildSubcuentasFile } from './subcuentas'

describe('buildSubcuentasRecord', () => {
  it('produces a 444 character record', () => {
    const record = buildSubcuentasRecord(
      {
        code: '57200001',
        title: 'Banco Principal',
        nif: 'B12345678',
        vatType: 'N',
        vatRate: 21,
      },
      8
    )
    expect(record.length).toBe(444)
  })

  it('places code at the start and title in position 13', () => {
    const record = buildSubcuentasRecord(
      {
        code: '57200001',
        title: 'Banco Principal',
      },
      8
    )
    expect(record.slice(0, 12).trim()).toBe('57200001')
    expect(record.slice(12, 52).trim()).toBe('Banco Principal')
  })

  it('pads account code to configured digits', () => {
    const record = buildSubcuentasRecord({ code: '572', title: 'Caja' }, 8)
    expect(record.slice(0, 8)).toBe('00000572')
  })
})

describe('buildSubcuentasFile', () => {
  it('joins records with CR+LF', () => {
    const file = buildSubcuentasFile(
      [
        { code: '57200001', title: 'Banco' },
        { code: '57000001', title: 'Caja' },
      ],
      8
    )
    expect(file.split('\r\n')).toHaveLength(2)
  })
})

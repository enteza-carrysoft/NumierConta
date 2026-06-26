import { describe, it, expect } from 'vitest'
import { buildDiarioRecord, buildDiarioFile } from './diario'

describe('buildDiarioRecord', () => {
  it('produces an 869 character record', () => {
    const record = buildDiarioRecord(
      {
        entryNumber: 1,
        date: '2026-06-15',
        accountCode: '57200001',
        concept: 'CIERRE Z 15/06 EFECT',
        debit: 874,
        credit: 0,
      },
      8
    )
    expect(record.length).toBe(869)
  })

  it('places entry number, date and account in the correct positions', () => {
    const record = buildDiarioRecord(
      {
        entryNumber: 1,
        date: '2026-06-15',
        accountCode: '57200001',
        concept: 'CIERRE Z 15/06 EFECT',
        debit: 874,
        credit: 0,
      },
      8
    )
    expect(record.slice(0, 6)).toBe('000001')
    expect(record.slice(6, 14)).toBe('20260615')
    expect(record.slice(14, 26).trim()).toBe('57200001')
  })

  it('marks rectifying invoices and invoice type', () => {
    const record = buildDiarioRecord(
      {
        entryNumber: 2,
        date: '2026-06-14',
        accountCode: '60000001',
        concept: 'FRA DISTRIB SUR MP',
        debit: 320,
        credit: 0,
        isRectifying: true,
        invoiceType: 'R',
      },
      8
    )
    expect(record.slice(338, 339)).toBe('T')
    expect(record.slice(868, 869)).toBe('R')
  })
})

describe('buildDiarioFile', () => {
  it('joins records with CR+LF', () => {
    const file = buildDiarioFile(
      [
        {
          entryNumber: 1,
          date: '2026-06-15',
          accountCode: '57200001',
          concept: 'CIERRE Z EFECT',
          debit: 100,
          credit: 0,
        },
        {
          entryNumber: 1,
          date: '2026-06-15',
          accountCode: '70000001',
          concept: 'CIERRE Z VTA21',
          debit: 0,
          credit: 100,
        },
      ],
      8
    )
    expect(file.split('\r\n')).toHaveLength(2)
  })
})

import { describe, it, expect } from 'vitest'
import { generateTxtFiles } from './generator'
import iconv from 'iconv-lite'

describe('generateTxtFiles', () => {
  it('encodes output in Windows-1252', () => {
    const result = generateTxtFiles({
      accountDigits: 8,
      accounts: [{ code: '57200001', title: 'Banco' }],
      lines: [
        {
          entryNumber: 1,
          date: '2026-06-15',
          accountCode: '57200001',
          concept: 'CIERRE Z 15/06 EFECT',
          debit: 874,
          credit: 0,
        },
      ],
    })

    expect(iconv.decode(result.subcuentas, 'win1252')).toContain('57200001')
    expect(iconv.decode(result.diario, 'win1252')).toContain('000001')
  })

  it('reproduces section 7.4 closure example totals', () => {
    const accounts = [
      { code: '57000001', title: 'Caja Efectivo' },
      { code: '57200001', title: 'Banco Tarjeta' },
      { code: '65900001', title: 'Invitaciones' },
      { code: '70000001', title: 'Ventas 21%', vatType: 'N', vatRate: 21 },
      { code: '70000002', title: 'Ventas 10%', vatType: 'N', vatRate: 10 },
      { code: '47700001', title: 'IVA 21%', vatType: 'N', vatRate: 21 },
      { code: '47700002', title: 'IVA 10%', vatType: 'N', vatRate: 10 },
    ]

    const lines = [
      { entryNumber: 1, date: '2026-06-15', accountCode: '57000001', concept: 'CIERRE Z 15/06 EFECT', debit: 874, credit: 0 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '57200001', concept: 'CIERRE Z 15/06 TARJ', debit: 600, credit: 0 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '65900001', concept: 'CIERRE Z 15/06 INVIT', debit: 26, credit: 0 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '70000002', concept: 'CIERRE Z 15/06 VTA10', debit: 0, credit: 900 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '47700002', concept: 'CIERRE Z 15/06 IVA10', debit: 0, credit: 90 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '70000001', concept: 'CIERRE Z 15/06 VTA21', debit: 0, credit: 400 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '47700001', concept: 'CIERRE Z 15/06 IVA21', debit: 0, credit: 84 },
      { entryNumber: 1, date: '2026-06-15', accountCode: '70000002', concept: 'CIERRE Z 15/06 INV.CT', debit: 0, credit: 26 },
    ]

    const result = generateTxtFiles({ accountDigits: 8, accounts, lines })
    const diario = iconv.decode(result.diario, 'win1252')

    const totalDebe = lines.reduce((sum, l) => sum + l.debit, 0)
    const totalHaber = lines.reduce((sum, l) => sum + l.credit, 0)

    expect(totalDebe).toBe(1500)
    expect(totalHaber).toBe(1500)
    expect(diario.split('\r\n')).toHaveLength(8)
  })
})

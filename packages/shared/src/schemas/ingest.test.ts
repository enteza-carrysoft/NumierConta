import { describe, it, expect } from 'vitest'
import { IngestTicketsPayloadSchema } from './ingest'

describe('IngestTicketsPayloadSchema', () => {
  // Payload de ejemplo de la sección 5.1 del documento de diseño
  const validPayload = {
    heads: [
      {
        numier_cab_id: 1024,
        ticket_date: '2026-06-15',
        ticket_time: '13:42:10',
        operator_code: '00001',
        state: 'C',
        payment_main: 'E',
        amount_card: 0,
        amount_check: 0,
        invoice_number: '',
        customer_nif: '',
        doc_number: 'FS-000123',
        numier_cli_id: null,
        total: 12.5,
        closure_fec_id: 42,
      },
    ],
    lines: [
      {
        numier_cab_id: 1024,
        line_seq: 1,
        article_code: '00001',
        qty: 2,
        unit_price: 1.2,
        line_amount: 2.4,
        vat_rate: 10,
        description: 'COCA-COLA',
      },
    ],
  }

  it('valida el payload de ejemplo de la sección 5.1', () => {
    const result = IngestTicketsPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rechaza un payload sin heads', () => {
    const result = IngestTicketsPayloadSchema.safeParse({ ...validPayload, heads: [] })
    expect(result.success).toBe(false)
  })

  it('rechaza un estado de ticket inválido', () => {
    const invalid = {
      ...validPayload,
      heads: [{ ...validPayload.heads[0], state: 'Z' }],
    }
    const result = IngestTicketsPayloadSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rechaza un payload con tipos malformados', () => {
    const invalid = {
      ...validPayload,
      heads: [{ ...validPayload.heads[0], numier_cab_id: 'not-a-number' }],
    }
    const result = IngestTicketsPayloadSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

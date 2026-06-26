import 'dotenv/config'
import path from 'path'
import { config } from 'dotenv'

config({ path: path.resolve(__dirname, '../../../apps/web/.env.local') })

/**
 * Simulador de agente Numier → Gateway
 *
 * No requiere Numier TPV ni VFPOLEDB. Genera datos sintéticos coherentes
 * y los envía a los endpoints de ingest del Gateway, como haría el agente real.
 *
 * Uso:
 *   pnpm --filter etl simulate-agent
 *
 * Variables (se leen de apps/web/.env.local o del entorno):
 *   - GATEWAY_URL          http://localhost:3000
 *   - AGENT_API_KEY        clave del agente (companies.agent_api_key)
 *   - SIMULATE_DAYS        días a simular (default: 7)
 *   - TICKETS_PER_DAY      tickets por día (default: 5)
 *   - EXPENSES_PER_DAY     gastos por día (default: 2)
 */

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000'
const AGENT_API_KEY = process.env.AGENT_API_KEY ?? 'test_agent_key_001'
const SIMULATE_DAYS = Number(process.env.SIMULATE_DAYS ?? 7)
const TICKETS_PER_DAY = Number(process.env.TICKETS_PER_DAY ?? 5)
const EXPENSES_PER_DAY = Number(process.env.EXPENSES_PER_DAY ?? 2)

interface AgentState {
  last_fec_id: number
}

interface IngestResult {
  inserted: number
  updated: number
  skipped: number
}

async function api<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/api${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Key': AGENT_API_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(`API ${route} failed (${res.status}): ${data.error ?? JSON.stringify(data)}`)
  }

  return data as T
}

async function getState(): Promise<AgentState> {
  const res = await fetch(`${GATEWAY_URL}/api/agent/state`, {
    headers: { 'X-Agent-Key': AGENT_API_KEY },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`agent/state failed (${res.status}): ${JSON.stringify(data)}`)
  }
  return data as AgentState
}

function dateIso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function datetimeIso(daysAgo: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function rnd(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

async function sendMasters() {
  const customers = Array.from({ length: 5 }, (_, i) => ({
    numier_cli_id: 1000 + i,
    nif: `B1234567${i}`,
    name: `Cliente de prueba ${i + 1}`,
    address: `Calle Ficticia ${i + 1}`,
    postal_code: '28001',
    city: 'Madrid',
    province: 'Madrid',
  }))

  const suppliers = Array.from({ length: 4 }, (_, i) => ({
    numier_con_id: 2000 + i,
    nif: `A9876543${i}`,
    name: `Proveedor de prueba ${i + 1}`,
    address: `Avenida Simulada ${i + 1}`,
    postal_code: '08001',
    city: 'Barcelona',
    province: 'Barcelona',
    category_id: 10 + i,
  }))

  const result = await api<IngestResult>('/ingest/masters', { customers, suppliers })
  console.log(`  masters: ${result.inserted} inserted, ${result.updated} updated`)
}

async function sendDay(fecId: number, daysAgo: number) {
  const date = dateIso(daysAgo)
  const openedAt = datetimeIso(daysAgo, 8)
  const closedAt = datetimeIso(daysAgo, 23)

  const totalSales = rnd(300, 900)
  const totalCard = rnd(totalSales * 0.4, totalSales * 0.7)
  const totalCash = totalSales - totalCard

  await api<IngestResult>('/ingest/closures', {
    closures: [
      {
        numier_fec_id: fecId,
        opened_at: openedAt,
        closed_at: closedAt,
        total_cash: totalCash,
        total_card: totalCard,
        total_sales: totalSales,
        change_kept: rnd(0, 20),
        withdrawals: rnd(0, 50),
      },
    ],
  })
  console.log(`  closure ${fecId}: ${date} — ${totalSales.toFixed(2)} €`)

  const heads = []
  const lines = []
  let cabId = fecId * 1000

  for (let t = 0; t < TICKETS_PER_DAY; t++) {
    cabId++
    const vatRate = pick([10, 21])
    const qty = Math.floor(rnd(1, 5))
    const unitPrice = rnd(5, 50)
    const lineAmount = Math.round(qty * unitPrice * 100) / 100
    const total = Math.round(lineAmount * (1 + vatRate / 100) * 100) / 100

    heads.push({
      numier_cab_id: cabId,
      ticket_date: date,
      ticket_time: `${10 + t}:00:00`,
      operator_code: 'OP1',
      state: 'C',
      payment_main: pick(['E', 'T']),
      amount_card: total,
      amount_check: 0,
      invoice_number: null,
      customer_nif: null,
      doc_number: `T${cabId}`,
      numier_cli_id: null,
      total,
      closure_fec_id: fecId,
    })

    lines.push({
      numier_cab_id: cabId,
      line_seq: 1,
      article_code: `ART${100 + t}`,
      qty,
      unit_price: unitPrice,
      line_amount: lineAmount,
      vat_rate: vatRate,
      description: `Artículo de prueba ${t + 1}`,
    })
  }

  const ticketResult = await api<IngestResult>('/ingest/tickets', { heads, lines })
  console.log(`  tickets: ${ticketResult.inserted} inserted`)

  const expenseHeads = []
  const expenseLines = []

  for (let e = 0; e < EXPENSES_PER_DAY; e++) {
    const gacId = fecId * 100 + e + 1
    const vatRate = 21
    const amount = rnd(30, 200)
    const total = Math.round(amount * (1 + vatRate / 100) * 100) / 100

    expenseHeads.push({
      numier_gac_id: gacId,
      expense_date: date,
      supplier_id: 2000 + e,
      total,
      from_cash: true,
      invoice_ref: `FAC-${gacId}`,
    })

    expenseLines.push({
      numier_gac_id: gacId,
      line_seq: 1,
      amount,
      total,
      vat_rate: vatRate,
    })
  }

  const expenseResult = await api<IngestResult>('/ingest/expenses', {
    heads: expenseHeads,
    lines: expenseLines,
  })
  console.log(`  expenses: ${expenseResult.inserted} inserted`)
}

async function main() {
  console.log('🚀 Simulador de agente Numier → Gateway')
  console.log(`   Gateway: ${GATEWAY_URL}`)
  console.log(`   Días a simular: ${SIMULATE_DAYS}`)
  console.log(`   Tickets/día: ${TICKETS_PER_DAY}`)
  console.log(`   Gastos/día: ${EXPENSES_PER_DAY}`)
  console.log()

  const state = await getState()
  console.log(`Estado actual: last_fec_id = ${state.last_fec_id}`)

  console.log('\nEnviando maestros...')
  await sendMasters()

  console.log('\nEnviando cierres, tickets y gastos...')
  for (let i = 0; i < SIMULATE_DAYS; i++) {
    const fecId = state.last_fec_id + i + 1
    await sendDay(fecId, SIMULATE_DAYS - i - 1)
  }

  const newState = await getState()
  console.log(`\n✅ Simulación completada. last_fec_id: ${state.last_fec_id} → ${newState.last_fec_id}`)
  console.log('\nAhora puedes ejecutar el ETL desde el panel o llamando a POST /api/etl/run')
}

main().catch((err) => {
  console.error('\n❌ Error en el simulador:', err.message)
  process.exit(1)
})

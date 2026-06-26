import { buildClosureEntry } from './closure-entry'
import { buildInvoiceEntry } from './invoice-entry'
import { buildExpenseEntry } from './expense-entry'
import type { EtlInput, StgClosure, StgTicketHead } from './types'
import type { EntryDraft } from '@numierconta/shared'

export interface RunEtlResult {
  entries: EntryDraft[]
  classiccontaDigits: number
}

export function runEtl(input: EtlInput): RunEtlResult {
  const {
    periodFrom,
    periodTo,
    closures,
    ticketHeads,
    ticketLines,
    expenseHeads,
    expenseLines,
    customers,
    suppliers,
    accounts,
    mappingRules,
  } = input

  const classiccontaDigits = 8
  const periodClosures = closures.filter((closure) =>
    isInPeriod(closure, periodFrom, periodTo)
  )

  const periodClosureIds = new Set(
    periodClosures.map((closure) => closure.numier_fec_id)
  )

  const periodTickets = ticketHeads.filter(
    (ticket) =>
      ticket.closure_fec_id !== null &&
      periodClosureIds.has(ticket.closure_fec_id)
  )

  const entries: EntryDraft[] = []

  // Asientos de cierre Z
  for (const closure of periodClosures) {
    const closureTickets = periodTickets.filter(
      (ticket) => ticket.closure_fec_id === closure.numier_fec_id
    )
    const closureTicketIds = new Set(
      closureTickets.map((ticket) => ticket.numier_cab_id)
    )
    const closureLines = ticketLines.filter((line) =>
      closureTicketIds.has(line.numier_cab_id)
    )

    entries.push(
      buildClosureEntry({
        closure,
        tickets: closureTickets,
        lines: closureLines,
        rules: mappingRules,
      })
    )
  }

  // Asientos de facturas nominales
  const nominalTickets = periodTickets.filter((ticket) =>
    isNominalInvoice(ticket)
  )

  for (const ticket of nominalTickets) {
    const lines = ticketLines.filter(
      (line) => line.numier_cab_id === ticket.numier_cab_id
    )

    entries.push(
      buildInvoiceEntry({
        ticket,
        lines,
        rules: mappingRules,
        customers,
        accounts,
        classiccontaDigits,
      })
    )
  }

  // Asientos de gastos
  const periodExpenses = expenseHeads.filter((expense) =>
    isDateInPeriod(expense.expense_date, periodFrom, periodTo)
  )

  for (const expense of periodExpenses) {
    const lines = expenseLines.filter(
      (line) => line.numier_gac_id === expense.numier_gac_id
    )

    entries.push(
      buildExpenseEntry({
        expense,
        lines,
        rules: mappingRules,
        suppliers,
        accounts,
        classiccontaDigits,
      })
    )
  }

  // Numeración correlativa
  const numberedEntries = entries.map((entry, index) => ({
    ...entry,
    entry_number: index + 1,
  }))

  return {
    entries: numberedEntries,
    classiccontaDigits,
  }
}

function isInPeriod(
  closure: StgClosure,
  periodFrom: string,
  periodTo: string
): boolean {
  const date = closure.closed_at?.slice(0, 10) ?? closure.opened_at?.slice(0, 10)
  if (!date) return false
  return date >= periodFrom && date <= periodTo
}

function isDateInPeriod(
  date: string,
  periodFrom: string,
  periodTo: string
): boolean {
  return date >= periodFrom && date <= periodTo
}

function isNominalInvoice(ticket: StgTicketHead): boolean {
  return (
    ticket.state === 'C' &&
    Boolean(ticket.invoice_number && ticket.invoice_number.trim().length > 0)
  )
}

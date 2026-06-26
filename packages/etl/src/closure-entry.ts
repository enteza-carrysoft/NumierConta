import { round2, sumBy, groupBy } from './utils'
import { calculateVat } from './vat'
import { calculateBalance, adjustRounding } from './balance'
import {
  resolveSalesAccount,
  resolveVatOutAccount,
  resolvePaymentAccount,
  resolveInvitationAccount,
  resolveInvitationContraAccount,
} from './mapping'
import type { StgClosure, StgTicketHead, StgTicketLine } from './types'
import type { MappingRule, EntryDraft, EntryLineDraft } from '@numierconta/shared'

export interface BuildClosureEntryInput {
  closure: StgClosure
  tickets: StgTicketHead[]
  lines: StgTicketLine[]
  rules: MappingRule[]
}

export function buildClosureEntry(input: BuildClosureEntryInput): EntryDraft {
  const { closure, tickets, lines, rules } = input
  const date = closure.closed_at?.slice(0, 10) ?? closure.opened_at?.slice(0, 10) ?? '2026-01-01'
  const concept = `CIERRE Z ${formatDate(date)}`

  const salesLines = buildSalesLines(lines, tickets, rules, concept)
  const invitationLines = buildInvitationLines(tickets, lines, rules, concept)
  const paymentLines = buildPaymentLines(tickets, rules, concept, salesLines, invitationLines)

  const allLines: EntryLineDraft[] = [
    ...paymentLines,
    ...invitationLines,
    ...salesLines,
  ]

  const adjustedLines = adjustRounding(allLines)
  const balance = calculateBalance(adjustedLines)

  return {
    entry_date: date,
    concept,
    source_type: 'closure',
    source_ref: String(closure.numier_fec_id),
    lines: adjustedLines,
    balanced: balance.balanced,
  }
}

function buildSalesLines(
  lines: StgTicketLine[],
  tickets: StgTicketHead[],
  rules: MappingRule[],
  baseConcept: string
): EntryLineDraft[] {
  const cashTicketIds = new Set(
    tickets
      .filter((ticket) => isCashTicket(ticket))
      .map((ticket) => ticket.numier_cab_id)
  )

  const cashLines = lines.filter((line) => cashTicketIds.has(line.numier_cab_id))
  const grouped = groupBy(cashLines, (line) => line.vat_rate ?? 0)

  const result: EntryLineDraft[] = []

  for (const [rateStr, groupLines] of Object.entries(grouped)) {
    const rate = Number(rateStr)
    const gross = sumBy(groupLines, (line) => line.line_amount ?? 0)
    const { base, quota } = calculateVat(gross, rate)

    result.push({
      account_code: resolveSalesAccount(rules, rate),
      concept: `${baseConcept} VTA${formatRate(rate)}`,
      debit: 0,
      credit: base,
    })

    if (quota > 0) {
      const vatAccount = resolveVatOutAccount(rules, rate)
      if (vatAccount) {
        result.push({
          account_code: vatAccount,
          concept: `${baseConcept} IVA${formatRate(rate)}`,
          debit: 0,
          credit: quota,
        })
      }
    }
  }

  return result
}

function buildInvitationLines(
  tickets: StgTicketHead[],
  lines: StgTicketLine[],
  rules: MappingRule[],
  baseConcept: string
): EntryLineDraft[] {
  const invitationTickets = tickets.filter((ticket) => ticket.state === 'I')
  if (invitationTickets.length === 0) {
    return []
  }

  const invitationIds = new Set(invitationTickets.map((t) => t.numier_cab_id))
  const amount = sumBy(
    lines.filter((line) => invitationIds.has(line.numier_cab_id)),
    (line) => line.line_amount ?? 0
  )

  if (amount <= 0) {
    return []
  }

  return [
    {
      account_code: resolveInvitationAccount(rules),
      concept: `${baseConcept} INVIT`,
      debit: amount,
      credit: 0,
    },
    {
      account_code: resolveInvitationContraAccount(rules),
      concept: `${baseConcept} INV.CT`,
      debit: 0,
      credit: amount,
    },
  ]
}

function buildPaymentLines(
  tickets: StgTicketHead[],
  rules: MappingRule[],
  baseConcept: string,
  salesLines: EntryLineDraft[],
  invitationLines: EntryLineDraft[]
): EntryLineDraft[] {
  const card = sumBy(tickets, (ticket) => ticket.amount_card ?? 0)
  const check = sumBy(tickets, (ticket) => ticket.amount_check ?? 0)
  const totalCredit = sumBy(salesLines, (line) => line.credit) + sumBy(invitationLines, (line) => line.credit)
  const cash = round2(totalCredit - card - check - sumBy(invitationLines, (line) => line.debit))

  const result: EntryLineDraft[] = []

  if (cash > 0) {
    result.push({
      account_code: resolvePaymentAccount(rules, 'EFECTIVO'),
      concept: `${baseConcept} EFECT`,
      debit: cash,
      credit: 0,
    })
  }

  if (card > 0) {
    result.push({
      account_code: resolvePaymentAccount(rules, 'TARJETA'),
      concept: `${baseConcept} TARJ`,
      debit: card,
      credit: 0,
    })
  }

  if (check > 0) {
    result.push({
      account_code: resolvePaymentAccount(rules, 'CHEQUE'),
      concept: `${baseConcept} CHEQ`,
      debit: check,
      credit: 0,
    })
  }

  return result
}

function isCashTicket(ticket: StgTicketHead): boolean {
  return ticket.state === 'C' && !isNominalInvoice(ticket)
}

function isNominalInvoice(ticket: StgTicketHead): boolean {
  return Boolean(
    ticket.invoice_number && ticket.invoice_number.trim().length > 0
  )
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2)
}

import { round2, sumBy, groupBy } from './utils'
import { calculateVat } from './vat'
import { calculateBalance, adjustRounding } from './balance'
import { resolveSalesAccount, resolveVatOutAccount } from './mapping'
import type { StgTicketHead, StgTicketLine, StgCustomer } from './types'
import type { Account, MappingRule, EntryDraft, EntryLineDraft } from '@numierconta/shared'

export interface BuildInvoiceEntryInput {
  ticket: StgTicketHead
  lines: StgTicketLine[]
  rules: MappingRule[]
  customers: StgCustomer[]
  accounts: Account[]
  classiccontaDigits: number
}

export function buildInvoiceEntry(input: BuildInvoiceEntryInput): EntryDraft {
  const { ticket, lines, rules, customers, accounts, classiccontaDigits } = input

  const customer = customers.find((c) => c.numier_cli_id === ticket.numier_cli_id)
  const customerAccount = resolveCustomerAccount(
    accounts,
    customer,
    ticket.numier_cli_id,
    classiccontaDigits
  )

  const concept = `FRA ${ticket.doc_number ?? ticket.invoice_number}`
  const entryLines: EntryLineDraft[] = []

  // Debe: cliente por el total de la factura
  entryLines.push({
    account_code: customerAccount,
    concept: `${concept} CLIENTE`,
    debit: round2(ticket.total ?? 0),
    credit: 0,
    vat_invoice_type: 'E',
  })

  // Haber: ventas + IVA por tipo
  const grouped = groupBy(lines, (line) => line.vat_rate ?? 0)

  for (const [rateStr, groupLines] of Object.entries(grouped)) {
    const rate = Number(rateStr)
    const gross = sumBy(groupLines, (line) => line.line_amount ?? 0)
    const { base, quota } = calculateVat(gross, rate)

    entryLines.push({
      account_code: resolveSalesAccount(rules, rate),
      concept: `${concept} VTA${formatRate(rate)}`,
      debit: 0,
      credit: base,
      vat_invoice_type: 'E',
    })

    if (quota > 0) {
      const vatAccount = resolveVatOutAccount(rules, rate)
      if (vatAccount) {
        entryLines.push({
          account_code: vatAccount,
          concept: `${concept} IVA${formatRate(rate)}`,
          debit: 0,
          credit: quota,
          vat_invoice_type: 'E',
        })
      }
    }
  }

  const adjustedLines = adjustRounding(entryLines)
  const balance = calculateBalance(adjustedLines)

  return {
    entry_date: ticket.ticket_date,
    concept,
    doc_number: ticket.doc_number ?? ticket.invoice_number ?? undefined,
    source_type: 'invoice',
    source_ref: String(ticket.numier_cab_id),
    lines: adjustedLines,
    balanced: balance.balanced,
  }
}

function resolveCustomerAccount(
  accounts: Account[],
  customer: StgCustomer | undefined,
  numierCliId: number | null,
  classiccontaDigits: number
): string {
  const nif = customer?.nif
  const existing = accounts.find(
    (account) =>
      account.account_class === 'customer' &&
      nif &&
      account.nif === nif
  )

  if (existing) {
    return existing.code
  }

  const suffix = String(numierCliId ?? 0).padStart(classiccontaDigits - 3, '0')
  return `430${suffix}`
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2)
}

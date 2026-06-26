import type { AgentConfig, RawClosure } from '../types'
import type { Logger } from '../logger'
import type { HttpClient } from '../api/client'
import type { QueryExecutor } from '../dbf/connection'
import { createHttpClient } from '../api/client'
import { fetchAgentState } from '../api/state'
import {
  ingestClosures,
  ingestTickets,
  ingestExpenses,
  ingestMasters,
} from '../api/ingest'
import { createDbfConnection } from '../dbf/connection'
import { readClosures } from '../dbf/closures'
import { readTicketHeads, readTicketLines } from '../dbf/tickets'
import { readExpenseHeads, readExpenseLines } from '../dbf/expenses'
import { readCustomers, readSuppliers } from '../dbf/masters'
import { loadSyncState, saveSyncState } from './state'

export interface SyncDependencies {
  httpClient: HttpClient
  dbf: QueryExecutor
}

function toVfpDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function shouldSyncMasters(
  state: { lastMasterSyncAt: string | null },
  intervalSeconds: number
): boolean {
  if (!state.lastMasterSyncAt) return true
  const last = new Date(state.lastMasterSyncAt).getTime()
  return Date.now() - last >= intervalSeconds * 1000
}

export interface SyncRunResult {
  closuresProcessed: number
  ticketsProcessed: number
  expensesProcessed: number
  mastersProcessed: number
  newLastFecId: number
}

export function createDependencies(config: AgentConfig): SyncDependencies {
  return {
    httpClient: createHttpClient(config.apiBaseUrl, config.agentApiKey),
    dbf: createDbfConnection(config.numierDataPath),
  }
}

export async function runSync(
  config: AgentConfig,
  logger: Logger,
  deps?: Partial<SyncDependencies>
): Promise<SyncRunResult> {
  const allDeps = {
    ...createDependencies(config),
    ...deps,
  }

  const { httpClient, dbf } = allDeps
  const syncState = loadSyncState(config.stateFilePath)

  logger.info('Iniciando ciclo de sincronización', {
    lastFecId: syncState.lastFecId,
  })

  const remoteState = await fetchAgentState(httpClient)
  logger.info('Estado remoto obtenido', { last_fec_id: remoteState.last_fec_id })

  const lastFecId = Math.max(syncState.lastFecId, remoteState.last_fec_id)
  const closures = await readClosures(dbf, lastFecId)
  logger.info('Cierres leídos', { count: closures.length })

  const closureFecIds = closures.map((c) => c.numier_fec_id)
  const ticketHeads = await readTicketHeads(dbf, closureFecIds)
  const ticketIds = ticketHeads.map((h) => h.numier_ticket_id)
  const ticketLines = await readTicketLines(dbf, ticketIds)
  logger.info('Tickets leídos', { heads: ticketHeads.length, lines: ticketLines.length })

  let expenseHeads: Awaited<ReturnType<typeof readExpenseHeads>> = []
  let expenseLines: Awaited<ReturnType<typeof readExpenseLines>> = []

  if (closures.length > 0) {
    const oldestClosure = closures.reduce((min, c) =>
      c.numier_fec_id < min.numier_fec_id ? c : min
    )
    const fromDate = toVfpDate(oldestClosure.opened_at)
    expenseHeads = await readExpenseHeads(dbf, fromDate)
    const expenseIds = expenseHeads.map((h) => h.numier_expense_id)
    expenseLines = await readExpenseLines(dbf, expenseIds)
    logger.info('Gastos leídos', { heads: expenseHeads.length, lines: expenseLines.length })
  }

  let customers: Awaited<ReturnType<typeof readCustomers>> = []
  let suppliers: Awaited<ReturnType<typeof readSuppliers>> = []

  if (shouldSyncMasters(syncState, config.masterSyncSeconds)) {
    customers = await readCustomers(dbf)
    suppliers = await readSuppliers(dbf)
    logger.info('Maestros leídos', { customers: customers.length, suppliers: suppliers.length })
  }

  if (closures.length > 0) {
    await ingestClosures(httpClient, closures)
  }

  if (ticketHeads.length > 0 || ticketLines.length > 0) {
    await ingestTickets(httpClient, ticketHeads, ticketLines)
  }

  if (expenseHeads.length > 0 || expenseLines.length > 0) {
    await ingestExpenses(httpClient, expenseHeads, expenseLines)
  }

  if (customers.length > 0 || suppliers.length > 0) {
    await ingestMasters(httpClient, customers, suppliers)
  }

  const newLastFecId =
    closures.length > 0
      ? Math.max(...closures.map((c) => c.numier_fec_id))
      : syncState.lastFecId

  const newState = {
    lastFecId: newLastFecId,
    lastMasterSyncAt:
      customers.length > 0 || suppliers.length > 0
        ? new Date().toISOString()
        : syncState.lastMasterSyncAt,
  }

  saveSyncState(config.stateFilePath, newState)
  logger.info('Ciclo completado', { newLastFecId })

  return {
    closuresProcessed: closures.length,
    ticketsProcessed: ticketHeads.length,
    expensesProcessed: expenseHeads.length,
    mastersProcessed: customers.length + suppliers.length,
    newLastFecId,
  }
}

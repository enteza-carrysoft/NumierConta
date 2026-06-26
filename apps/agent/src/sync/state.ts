import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { SyncState } from '../types'

const DEFAULT_STATE: SyncState = {
  lastFecId: 0,
  lastMasterSyncAt: null,
}

export function loadSyncState(path: string): SyncState {
  if (!existsSync(path)) {
    return { ...DEFAULT_STATE }
  }

  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<SyncState>

  return {
    lastFecId: typeof parsed.lastFecId === 'number' ? parsed.lastFecId : DEFAULT_STATE.lastFecId,
    lastMasterSyncAt:
      typeof parsed.lastMasterSyncAt === 'string'
        ? parsed.lastMasterSyncAt
        : DEFAULT_STATE.lastMasterSyncAt,
  }
}

export function saveSyncState(path: string, state: SyncState): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8')
}

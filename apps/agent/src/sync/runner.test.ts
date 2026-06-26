import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runSync } from './runner'
import { Logger } from '../logger'
import { createMockExecutor } from '../dbf/connection'
import type { HttpClient } from '../api/client'
import type { AgentConfig } from '../types'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

function createMockHttpClient(): HttpClient {
  return {
    get: async <T>() => ({ status: 200, body: { last_fec_id: 0 } as T }),
    post: async <T>() => ({ status: 200, body: { processed: 1 } as T }),
  }
}

function createConfig(tmpDir: string): AgentConfig {
  return {
    numierDataPath: 'C:\\Numier\\Datos',
    apiBaseUrl: 'http://localhost:3000',
    agentApiKey: 'test_key',
    pollSeconds: 60,
    masterSyncSeconds: 3600,
    logLevel: 'error',
    stateFilePath: join(tmpDir, 'agent-state.json'),
  }
}

describe('runSync', () => {
  let tmpDir: string
  let config: AgentConfig
  let logger: Logger

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agent-test-'))
    config = createConfig(tmpDir)
    logger = new Logger('error')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('processes closures and advances last_fec_id', async () => {
    const dbf = createMockExecutor({
      'from fechas': [
        {
          FEC_ID: 5,
          FEC_INICIO: new Date('2026-06-15T08:00:00Z'),
          FEC_FIN: new Date('2026-06-15T23:00:00Z'),
          TOTAL_VENTAS: 100,
        },
      ],
      'from cabecera': [],
      'from detalle': [],
      'from gastocab': [],
      'from gastodet': [],
      'from clientes': [],
      'from proveedo': [],
    })

    const result = await runSync(config, logger, {
      httpClient: createMockHttpClient(),
      dbf,
    })

    expect(result.closuresProcessed).toBe(1)
    expect(result.newLastFecId).toBe(5)
  })
})

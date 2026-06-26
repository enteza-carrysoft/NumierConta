import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { AgentConfig, LogLevel } from '../types'

function getEnv(key: string): string | undefined
function getEnv(key: string, fallback: string): string
function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isLogLevel(value: string): value is LogLevel {
  return ['debug', 'info', 'warn', 'error'].includes(value)
}

function loadJsonConfig(path: string): Partial<AgentConfig> {
  if (!existsSync(path)) {
    return {}
  }
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw) as Partial<AgentConfig>
}

export function loadConfig(): AgentConfig {
  const configPath = getEnv('AGENT_CONFIG_PATH', './config/agent.json')
  const jsonConfig = loadJsonConfig(resolve(configPath))

  const numierDataPath = getEnv('NUMIER_DATA_PATH', jsonConfig.numierDataPath ?? '')
  const apiBaseUrl = getEnv('API_BASE_URL', jsonConfig.apiBaseUrl ?? '')
  const agentApiKey = getEnv('AGENT_API_KEY', jsonConfig.agentApiKey ?? '')

  if (!numierDataPath) {
    throw new Error('Missing required config: numierDataPath (NUMIER_DATA_PATH)')
  }
  if (!apiBaseUrl) {
    throw new Error('Missing required config: apiBaseUrl (API_BASE_URL)')
  }
  if (!agentApiKey) {
    throw new Error('Missing required config: agentApiKey (AGENT_API_KEY)')
  }

  const logLevelEnv = getEnv('LOG_LEVEL', jsonConfig.logLevel ?? 'info')
  const logLevel: LogLevel = isLogLevel(logLevelEnv) ? logLevelEnv : 'info'

  const stateFilePath = getEnv(
    'STATE_FILE_PATH',
    jsonConfig.stateFilePath ?? './data/agent-state.json'
  )

  return {
    numierDataPath,
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
    agentApiKey,
    pollSeconds: parseNumber(getEnv('POLL_SECONDS', String(jsonConfig.pollSeconds)), 60),
    masterSyncSeconds: parseNumber(
      getEnv('MASTER_SYNC_SECONDS', String(jsonConfig.masterSyncSeconds)),
      3600
    ),
    logLevel,
    stateFilePath,
  }
}

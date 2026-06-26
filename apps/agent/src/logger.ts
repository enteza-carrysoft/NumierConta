import type { LogLevel } from './types'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export class Logger {
  constructor(private level: LogLevel = 'info') {}

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.level]
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    if (meta !== undefined) {
      console.log(`${prefix} ${message}`, meta)
    } else {
      console.log(`${prefix} ${message}`)
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log('debug', message, meta)
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta)
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta)
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta)
  }
}

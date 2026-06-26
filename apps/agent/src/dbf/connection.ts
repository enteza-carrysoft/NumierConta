import ADODB from 'node-adodb'
import type { open as AdodbConnection } from 'node-adodb'

export interface QueryExecutor {
  query<T>(sql: string): Promise<T>
}

export function createDbfConnection(numierDataPath: string): QueryExecutor {
  const connectionString = `Provider=VFPOLEDB.1;Data Source=${numierDataPath};Mode=Read|Share Deny None;`
  const connection: AdodbConnection = ADODB.open(connectionString, false)

  return {
    query<T>(sql: string): Promise<T> {
      return connection.query<T>(sql)
    },
  }
}

export function createMockExecutor(queries: Record<string, unknown[]>): QueryExecutor {
  return {
    query<T>(sql: string): Promise<T> {
      const lowerSql = sql.toLowerCase()
      for (const key of Object.keys(queries)) {
        if (lowerSql.includes(key.toLowerCase())) {
          return Promise.resolve(queries[key] as T)
        }
      }
      return Promise.resolve([] as unknown as T)
    },
  }
}

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { runMigrations, type MigrationProgress } from '../migrations'

export type BindValue = string | number | null | Uint8Array
export interface RunResult {
  lastInsertRowId: number
  changes: number
}

export interface SqlDatabase {
  exec(sql: string): Promise<void>
  run(sql: string, ...params: BindValue[]): Promise<RunResult>
  first<T>(sql: string, ...params: BindValue[]): Promise<T | null>
  all<T>(sql: string, ...params: BindValue[]): Promise<T[]>
  transaction<T>(operation: (database: SqlDatabase) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export async function openTrainingDatabase(
  onMigration?: (progress: MigrationProgress) => void,
): Promise<SqlDatabase> {
  const native = await openDatabaseAsync('training.db')
  const database = adapter(native)
  try {
    await database.exec('PRAGMA foreign_keys = ON')
    await database.exec('PRAGMA journal_mode = WAL')
    await runMigrations(database, onMigration)
    return database
  } catch (cause) {
    await database.close()
    throw cause
  }
}

export * from './seed'
export * from './installation'
export * from './catalog'

function adapter(native: SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => native.execAsync(sql),
    run: async (sql, ...params) => {
      const result = await native.runAsync(sql, ...params)
      return { lastInsertRowId: result.lastInsertRowId, changes: result.changes }
    },
    first: <T>(sql: string, ...params: BindValue[]) =>
      native.getFirstAsync<T>(sql, ...params) as Promise<T | null>,
    all: <T>(sql: string, ...params: BindValue[]) =>
      native.getAllAsync<T>(sql, ...params),
    transaction: async <T>(operation: (database: SqlDatabase) => Promise<T>) => {
      let result!: T
      await native.withExclusiveTransactionAsync(async (transaction) => {
        result = await operation(adapter(transaction))
      })
      return result
    },
    close: () => native.closeAsync(),
  }
}

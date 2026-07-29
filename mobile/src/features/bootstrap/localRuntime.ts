import type { LocalRepositories, SqlDatabase } from '@training/training-local-db'

export interface RuntimeDependencies {
  open(onMigration: (name: string) => void): Promise<SqlDatabase>
  initialize(database: SqlDatabase): Promise<void>
  createRepositories(database: SqlDatabase): LocalRepositories
  markStartup(database: SqlDatabase): Promise<void>
}

export interface RuntimeResult {
  database: SqlDatabase
  repositories: LocalRepositories
}

export function createLocalRuntimeManager(dependencies: RuntimeDependencies) {
  let current: SqlDatabase | null = null
  let running: Promise<RuntimeResult> | null = null
  let disposed = false
  const closed = new Set<SqlDatabase>()
  const closeOnce = async (database: SqlDatabase | null) => {
    if (!database || closed.has(database)) return
    closed.add(database)
    await database.close()
  }

  return {
    start(onMigration: (name: string) => void) {
      if (running) return running
      running = (async () => {
        await closeOnce(current)
        current = null
        let opened: SqlDatabase | null = null
        try {
          opened = await dependencies.open(onMigration)
          await dependencies.initialize(opened)
          const repositories = dependencies.createRepositories(opened)
          await dependencies.markStartup(opened)
          if (disposed) throw new Error('Inicialização cancelada.')
          current = opened
          return { database: opened, repositories }
        } catch (cause) {
          await closeOnce(opened)
          current = null
          throw cause
        }
      })().finally(() => {
        running = null
      })
      return running
    },
    async dispose() {
      disposed = true
      try {
        await running
      } catch {
        // A inicialização já fechou a conexão aberta.
      }
      await closeOnce(current)
      current = null
    },
  }
}

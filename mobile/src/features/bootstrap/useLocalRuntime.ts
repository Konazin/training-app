import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createLocalRepositories,
  initializeFirstInstallation,
  markSuccessfulStartup,
  openTrainingDatabase,
  type LocalRepositories,
  type SqlDatabase,
} from '@training/training-local-db'
import { localDateKey } from '@training/training-domain'
import { createLocalRuntimeManager } from './localRuntime'

export type LocalRuntimeState =
  | 'initializing_database'
  | 'migrating_data'
  | 'ready'
  | 'error'

export interface LocalRuntime {
  state: LocalRuntimeState
  message: string
  migrationName: string
  repositories: LocalRepositories | null
  database: SqlDatabase | null
  retry: () => Promise<void>
}

export function useLocalRuntime(): LocalRuntime {
  const [state, setState] = useState<LocalRuntimeState>('initializing_database')
  const [message, setMessage] = useState('')
  const [migrationName, setMigrationName] = useState('')
  const [repositories, setRepositories] = useState<LocalRepositories | null>(null)
  const [database, setDatabase] = useState<SqlDatabase | null>(null)
  const mounted = useRef(true)
  const running = useRef<Promise<void> | null>(null)
  const manager = useRef(createLocalRuntimeManager({
    open: (onMigration) => openTrainingDatabase((progress) => {
      onMigration(`${progress.version} · ${progress.name}`)
    }),
    initialize: (opened) => initializeFirstInstallation(opened).then(() => undefined),
    createRepositories: createLocalRepositories,
    afterInitialize: async (repositories) => {
      await repositories.planTrash.purgeExpired()
      await repositories.nutritionMaintenance.run(localDateKey(new Date()))
    },
    markStartup: markSuccessfulStartup,
  }))

  const start = useCallback(() => {
    if (running.current) return running.current
    setState('initializing_database')
    setMessage('')
    setMigrationName('')
    setRepositories(null)
    setDatabase(null)
    const operation = manager.current.start((name) => {
      if (mounted.current) {
          setState('migrating_data')
        setMigrationName(name)
      }
    }).then((result) => {
      if (mounted.current) {
        setRepositories(result.repositories)
        setDatabase(result.database)
        setState('ready')
      }
    }).catch((cause) => {
      if (mounted.current) {
        setRepositories(null)
        setDatabase(null)
        setMessage(cause instanceof Error ? cause.message : 'Falha ao abrir os dados locais.')
        setState('error')
      }
    }).finally(() => {
      if (running.current === operation) running.current = null
    })
    running.current = operation
    return operation
  }, [])

  useEffect(() => {
    mounted.current = true
    void start()
    return () => {
      mounted.current = false
      void manager.current.dispose()
    }
  }, [start])

  return {
    state,
    message,
    migrationName,
    repositories,
    database,
    retry: start,
  }
}

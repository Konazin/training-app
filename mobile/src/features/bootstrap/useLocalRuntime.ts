import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createLocalRepositories,
  openTrainingDatabase,
  seedEmptyDatabase,
  type LocalRepositories,
  type SeedData,
  type SqlDatabase,
} from '@training/training-local-db'
import seed from '../../../assets/seeds/exercises.v1.json'

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
  const databaseRef = useRef<SqlDatabase | null>(null)
  const running = useRef<Promise<void> | null>(null)

  const start = useCallback(() => {
    if (running.current) return running.current
    running.current = (async () => {
      setState('initializing_database')
      setMessage('')
      setMigrationName('')
      try {
        const database = await openTrainingDatabase((progress) => {
          setState('migrating_data')
          setMigrationName(`${progress.version} · ${progress.name}`)
        })
        databaseRef.current = database
        await seedEmptyDatabase(database, seed as SeedData)
        setRepositories(createLocalRepositories(database))
        setState('ready')
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : 'Falha ao abrir os dados locais.')
        setState('error')
      }
    })().finally(() => {
      running.current = null
    })
    return running.current
  }, [])

  useEffect(() => {
    void start()
    return () => {
      const database = databaseRef.current
      databaseRef.current = null
      if (database) void database.close()
    }
  }, [start])

  return {
    state,
    message,
    migrationName,
    repositories,
    database: databaseRef.current,
    retry: start,
  }
}

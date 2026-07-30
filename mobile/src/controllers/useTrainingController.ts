import { useCallback, useState } from 'react'
import type {
  Dashboard,
  DashboardRepository,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseLibraryRepository,
} from '@training/training-domain'

export function useTrainingController(
  exercises: ExerciseLibraryRepository,
  dashboardRepository: DashboardRepository,
) {
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseDefinition[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [library, dashboard] = await Promise.all([
        exercises.list(),
        dashboardRepository.get(),
      ])
      setExerciseLibrary(library)
      setDashboard(dashboard)
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      setLoading(false)
    }
  }, [dashboardRepository, exercises])

  const createExerciseDefinition = useCallback(async (input: ExerciseDefinitionInput) => {
    setLoading(true)
    setMessage('')
    try {
      await exercises.create(input)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      setLoading(false)
    }
  }, [exercises])

  const updateExerciseDefinition = useCallback(async (id: number, input: ExerciseDefinitionInput) => {
    setLoading(true)
    setMessage('')
    try {
      await exercises.update(id, input)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      setLoading(false)
    }
  }, [exercises])

  const archiveExerciseDefinition = useCallback(async (id: number) => {
    try {
      await exercises.archive(id)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    }
  }, [exercises])

  const setExerciseFavorite = useCallback(async (id: number, favorite: boolean) => {
    try {
      await exercises.setFavorite(id, favorite)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    }
  }, [exercises])

  const registerExerciseRecent = useCallback(async (id: number) => {
    try {
      await exercises.recordRecentUsage(id)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    }
  }, [exercises])

  const updateExerciseNotes = useCallback(async (id: number, notes: string) => {
    try {
      await exercises.updateNotes(id, notes)
      setExerciseLibrary(await exercises.list())
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    }
  }, [exercises])

  return {
    exerciseLibrary,
    dashboard,
    loading,
    message,
    refresh,
    createExerciseDefinition,
    updateExerciseDefinition,
    archiveExerciseDefinition,
    setExerciseFavorite,
    registerExerciseRecent,
    updateExerciseNotes,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

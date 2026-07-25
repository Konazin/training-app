import { useCallback, useMemo, useState } from 'react'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  Workout,
  WorkoutInput,
} from '../models/training'
import { trainingApi } from '../services/trainingApi'

export function useTrainingController() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseDefinition[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const selectedWorkout = useMemo(
    () => workouts.find((workout) => workout.id === selectedWorkoutId),
    [selectedWorkoutId, workouts],
  )
  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [workoutData, dashboardData, libraryData] = await Promise.all([
        trainingApi.getWorkouts(),
        trainingApi.getDashboard(),
        trainingApi.getExerciseLibrary(),
      ])
      setWorkouts(workoutData)
      setDashboard(dashboardData)
      setExerciseLibrary(libraryData)
      setSelectedWorkoutId((current) => current ?? workoutData[0]?.id ?? null)
    } catch (cause) {
      setMessage(messageFrom(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  const mutate = useCallback(async (operation: () => Promise<void>) => {
    setLoading(true)
    setMessage('')
    try {
      await operation()
      const [workoutData, dashboardData, libraryData] = await Promise.all([
        trainingApi.getWorkouts(),
        trainingApi.getDashboard(),
        trainingApi.getExerciseLibrary(),
      ])
      setWorkouts(workoutData)
      setDashboard(dashboardData)
      setExerciseLibrary(libraryData)
      setSelectedWorkoutId((current) =>
        workoutData.some((item) => item.id === current) ? current : workoutData[0]?.id ?? null,
      )
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkout = useCallback(
    (payload: WorkoutInput) =>
      mutate(async () => {
        const created = await trainingApi.createWorkout(payload)
        setSelectedWorkoutId(created.id)
      }),
    [mutate],
  )

  const removeWorkout = useCallback(
    (id: number) => mutate(() => trainingApi.deleteWorkout(id)),
    [mutate],
  )

  const addExercise = useCallback(
    (payload: ExerciseInput) => {
      if (!selectedWorkoutId) {
        setMessage('Selecione um treino antes de adicionar o exercício.')
        return Promise.resolve(false)
      }
      return mutate(() => trainingApi.addExercise(selectedWorkoutId, payload).then(() => undefined))
    },
    [mutate, selectedWorkoutId],
  )

  const removeExercise = useCallback(
    (workoutId: number, exerciseId: number) =>
      mutate(() => trainingApi.deleteExercise(workoutId, exerciseId)),
    [mutate],
  )

  const createExerciseDefinition = useCallback((payload: ExerciseDefinitionInput) =>
    mutate(() => trainingApi.createExerciseDefinition(payload).then(() => undefined)), [mutate])

  return {
    workouts,
    exerciseLibrary,
    dashboard,
    selectedWorkout,
    selectedWorkoutId,
    setSelectedWorkoutId,
    loading,
    message,
    refresh,
    createWorkout,
    removeWorkout,
    addExercise,
    removeExercise,
    createExerciseDefinition,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

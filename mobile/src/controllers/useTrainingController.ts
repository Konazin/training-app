import { useCallback, useMemo, useState } from 'react'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  SessionExerciseStatus,
  TrainingPlan,
  TrainingPlanInput,
  Workout,
  WorkoutInput,
  WorkoutSession,
} from '../models/training'
import { trainingApi } from '../services/trainingApi'

export function useTrainingController() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseDefinition[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null)
  const [selectedTrainingPlanId, setSelectedTrainingPlanId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const selectedWorkout = useMemo(
    () => workouts.find((workout) => workout.id === selectedWorkoutId),
    [selectedWorkoutId, workouts],
  )
  const selectedTrainingPlan = useMemo(
    () => trainingPlans.find((plan) => plan.id === selectedTrainingPlanId),
    [selectedTrainingPlanId, trainingPlans],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [workoutData, dashboardData, planData, libraryData, sessionData, activeData] = await Promise.all([
        trainingApi.getWorkouts(),
        trainingApi.getDashboard(),
        trainingApi.getTrainingPlans(),
        trainingApi.getExerciseLibrary(),
        trainingApi.getSessions(),
        trainingApi.getActiveSession(),
      ])
      setWorkouts(workoutData)
      setDashboard(dashboardData)
      setTrainingPlans(planData)
      setExerciseLibrary(libraryData)
      setSessions(sessionData)
      setActiveSession(activeData ?? null)
      setSelectedWorkoutId((current) => current ?? workoutData[0]?.id ?? null)
      setSelectedTrainingPlanId((current) => current ?? planData[0]?.id ?? null)
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
      const [workoutData, dashboardData, planData, libraryData, sessionData, activeData] = await Promise.all([
        trainingApi.getWorkouts(),
        trainingApi.getDashboard(),
        trainingApi.getTrainingPlans(),
        trainingApi.getExerciseLibrary(),
        trainingApi.getSessions(),
        trainingApi.getActiveSession(),
      ])
      setWorkouts(workoutData)
      setDashboard(dashboardData)
      setTrainingPlans(planData)
      setExerciseLibrary(libraryData)
      setSessions(sessionData)
      setActiveSession(activeData ?? null)
      setSelectedWorkoutId((current) =>
        workoutData.some((item) => item.id === current) ? current : workoutData[0]?.id ?? null,
      )
      setSelectedTrainingPlanId((current) =>
        planData.some((item) => item.id === current) ? current : planData[0]?.id ?? null,
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

  const createTrainingPlan = useCallback(
    (payload: TrainingPlanInput) =>
      mutate(async () => {
        const created = await trainingApi.createTrainingPlan(payload)
        setSelectedTrainingPlanId(created.id)
      }),
    [mutate],
  )

  const removeTrainingPlan = useCallback(
    (id: number) => mutate(() => trainingApi.deleteTrainingPlan(id)),
    [mutate],
  )

  const addPlanExercise = useCallback(
    (payload: ExerciseInput) => {
      if (!selectedTrainingPlanId) {
        setMessage('Selecione uma ficha antes de adicionar o exercício.')
        return Promise.resolve(false)
      }
      return mutate(() =>
        trainingApi.addPlanExercise(selectedTrainingPlanId, payload).then(() => undefined),
      )
    },
    [mutate, selectedTrainingPlanId],
  )

  const removePlanExercise = useCallback(
    (planId: number, exerciseId: number) =>
      mutate(() => trainingApi.deletePlanExercise(planId, exerciseId)),
    [mutate],
  )

  const activateTrainingPlan = useCallback((id: number) =>
    mutate(() => trainingApi.activateTrainingPlan(id).then(() => undefined)), [mutate])

  const updatePlanDay = useCallback((planId: number, dayId: number, payload: {
    title: string; description: string; restDay: boolean; estimatedDurationMinutes: number; notes: string
  }) => mutate(() => trainingApi.updatePlanDay(planId, dayId, payload).then(() => undefined)), [mutate])

  const addDayExercise = useCallback((planId: number, dayId: number, exerciseDefinitionId: number) =>
    mutate(() => trainingApi.addDayExercise(planId, dayId, {
      exerciseDefinitionId, sets: 3, minReps: 8, maxReps: 12, plannedLoad: 0,
      plannedDurationSeconds: null, plannedDistance: 0, restSeconds: 60, plannedRpe: null,
      setType: 'NORMAL', notes: '', alternativeExerciseId: null,
    }).then(() => undefined)), [mutate])

  const addRestActivity = useCallback((planId: number, dayId: number, name: string) =>
    mutate(() => trainingApi.addRestActivity(planId, dayId, {
      name, description: '', estimatedDurationMinutes: 15, category: 'Recuperação ativa', optional: true,
    }).then(() => undefined)), [mutate])

  const createExerciseDefinition = useCallback((payload: ExerciseDefinitionInput) =>
    mutate(() => trainingApi.createExerciseDefinition(payload).then(() => undefined)), [mutate])

  const startSession = useCallback((planId: number, dayId: number) =>
    mutate(async () => { setActiveSession(await trainingApi.startSession(planId, dayId)) }), [mutate])

  const updateSessionSet = useCallback(async (exerciseId: number, setId: number, payload: {
    reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string
  }) => {
    if (!activeSession) return false
    try {
      setActiveSession(await trainingApi.updateSet(activeSession.id, exerciseId, setId, payload))
      return true
    } catch (cause) { setMessage(messageFrom(cause)); return false }
  }, [activeSession])

  const setSessionExerciseStatus = useCallback(async (exerciseId: number, status: SessionExerciseStatus) => {
    if (!activeSession) return false
    setActiveSession(await trainingApi.setSessionExerciseStatus(activeSession.id, exerciseId, status))
    return true
  }, [activeSession])

  const completeSession = useCallback((rpe: number | null, notes: string) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(() => trainingApi.completeSession(activeSession.id, rpe, notes).then(() => { setActiveSession(null) }))
  }, [activeSession, mutate])

  const abandonSession = useCallback(() => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(() => trainingApi.abandonSession(activeSession.id).then(() => { setActiveSession(null) }))
  }, [activeSession, mutate])

  return {
    workouts,
    trainingPlans,
    exerciseLibrary,
    sessions,
    activeSession,
    dashboard,
    selectedWorkout,
    selectedWorkoutId,
    setSelectedWorkoutId,
    selectedTrainingPlan,
    selectedTrainingPlanId,
    setSelectedTrainingPlanId,
    loading,
    message,
    refresh,
    createWorkout,
    removeWorkout,
    addExercise,
    removeExercise,
    createTrainingPlan,
    removeTrainingPlan,
    addPlanExercise,
    removePlanExercise,
    activateTrainingPlan,
    updatePlanDay,
    addDayExercise,
    addRestActivity,
    createExerciseDefinition,
    startSession,
    updateSessionSet,
    setSessionExerciseStatus,
    completeSession,
    abandonSession,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

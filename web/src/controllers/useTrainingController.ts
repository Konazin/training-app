import { computed, ref } from 'vue'
import type {
  Dashboard,
  DayExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseInput,
  SessionExerciseStatus,
  TrainingPlan,
  TrainingPlanInput,
  TrainingPlanDay,
  Workout,
  WorkoutInput,
  WorkoutSession,
} from '../models/training'
import { trainingApi } from '../services/trainingApi'

export function useTrainingController() {
  const workouts = ref<Workout[]>([])
  const trainingPlans = ref<TrainingPlan[]>([])
  const exerciseLibrary = ref<ExerciseDefinition[]>([])
  const sessions = ref<WorkoutSession[]>([])
  const activeSession = ref<WorkoutSession | null>(null)
  const dashboard = ref<Dashboard | null>(null)
  const selectedWorkoutId = ref<number | null>(null)
  const selectedTrainingPlanId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  const selectedWorkout = computed(() =>
    workouts.value.find((workout) => workout.id === selectedWorkoutId.value),
  )
  const selectedTrainingPlan = computed(() =>
    trainingPlans.value.find((plan) => plan.id === selectedTrainingPlanId.value),
  )

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const [workoutData, dashboardData, planData, libraryData, sessionData, activeData] = await Promise.all([
        trainingApi.getWorkouts(),
        trainingApi.getDashboard(),
        trainingApi.getTrainingPlans(),
        trainingApi.getExerciseLibrary(),
        trainingApi.getSessions(),
        trainingApi.getActiveSession(),
      ])
      workouts.value = workoutData
      dashboard.value = dashboardData
      trainingPlans.value = planData
      exerciseLibrary.value = libraryData
      sessions.value = sessionData
      activeSession.value = activeData ?? null
      if (!selectedWorkoutId.value && workoutData[0]) {
        selectedWorkoutId.value = workoutData[0].id
      }
      if (!selectedTrainingPlanId.value && planData[0]) {
        selectedTrainingPlanId.value = planData[0].id
      }
    } catch (cause) {
      error.value = messageFrom(cause)
    } finally {
      loading.value = false
    }
  }

  async function createWorkout(payload: WorkoutInput) {
    return runMutation(async () => {
      const created = await trainingApi.createWorkout(payload)
      selectedWorkoutId.value = created.id
      notice.value = 'Treino adicionado com sucesso.'
    })
  }

  async function removeWorkout(id: number) {
    return runMutation(async () => {
      await trainingApi.deleteWorkout(id)
      if (selectedWorkoutId.value === id) selectedWorkoutId.value = null
      notice.value = 'Treino removido.'
    })
  }

  async function addExercise(payload: ExerciseInput) {
    if (!selectedWorkoutId.value) {
      error.value = 'Selecione um treino antes de adicionar o exercício.'
      return false
    }
    return runMutation(async () => {
      await trainingApi.addExercise(selectedWorkoutId.value!, payload)
      notice.value = 'Exercício adicionado ao treino.'
    })
  }

  async function removeExercise(workoutId: number, exerciseId: number) {
    return runMutation(async () => {
      await trainingApi.deleteExercise(workoutId, exerciseId)
      notice.value = 'Exercício removido.'
    })
  }

  async function createTrainingPlan(payload: TrainingPlanInput) {
    return runMutation(async () => {
      const created = await trainingApi.createTrainingPlan(payload)
      selectedTrainingPlanId.value = created.id
      notice.value = 'Ficha criada com sucesso.'
    })
  }

  async function removeTrainingPlan(id: number) {
    return runMutation(async () => {
      await trainingApi.deleteTrainingPlan(id)
      if (selectedTrainingPlanId.value === id) selectedTrainingPlanId.value = null
      notice.value = 'Ficha removida.'
    })
  }

  async function addPlanExercise(payload: ExerciseInput) {
    if (!selectedTrainingPlanId.value) {
      error.value = 'Selecione uma ficha antes de adicionar o exercício.'
      return false
    }
    return runMutation(async () => {
      await trainingApi.addPlanExercise(selectedTrainingPlanId.value!, payload)
      notice.value = 'Exercício adicionado à ficha.'
    })
  }

  async function removePlanExercise(planId: number, exerciseId: number) {
    return runMutation(async () => {
      await trainingApi.deletePlanExercise(planId, exerciseId)
      notice.value = 'Exercício removido da ficha.'
    })
  }

  async function activateTrainingPlan(id: number) {
    return runMutation(async () => {
      await trainingApi.activateTrainingPlan(id)
      notice.value = 'Ficha definida como ativa.'
    })
  }

  async function duplicateTrainingPlan(id: number) {
    return runMutation(async () => {
      const created = await trainingApi.duplicateTrainingPlan(id)
      selectedTrainingPlanId.value = created.id
      notice.value = 'Ficha duplicada.'
    })
  }

  async function archiveTrainingPlan(id: number) {
    return runMutation(async () => {
      await trainingApi.archiveTrainingPlan(id)
      notice.value = 'Ficha arquivada.'
    })
  }

  async function updatePlanDay(planId: number, day: TrainingPlanDay, restDay = day.restDay) {
    return runMutation(async () => {
      await trainingApi.updatePlanDay(planId, day.id, {
        title: day.title,
        description: day.description,
        restDay,
        estimatedDurationMinutes: day.estimatedDurationMinutes,
        notes: day.notes,
      })
      notice.value = 'Dia atualizado.'
    })
  }

  async function addDayExercise(planId: number, dayId: number, payload: DayExerciseInput) {
    return runMutation(async () => {
      await trainingApi.addDayExercise(planId, dayId, payload)
      notice.value = 'Exercício adicionado ao dia.'
    })
  }

  async function removeDayExercise(planId: number, dayId: number, exerciseId: number) {
    return runMutation(async () => {
      await trainingApi.removeDayExercise(planId, dayId, exerciseId)
      notice.value = 'Exercício removido do dia.'
    })
  }

  async function addRestActivity(
    planId: number,
    dayId: number,
    payload: { name: string; description: string; estimatedDurationMinutes: number; category: string; optional: boolean },
  ) {
    return runMutation(async () => {
      await trainingApi.addRestActivity(planId, dayId, payload)
      notice.value = 'Atividade opcional adicionada.'
    })
  }

  async function removeRestActivity(planId: number, dayId: number, activityId: number) {
    return runMutation(async () => {
      await trainingApi.removeRestActivity(planId, dayId, activityId)
      notice.value = 'Atividade removida.'
    })
  }

  async function createExerciseDefinition(payload: ExerciseDefinitionInput) {
    return runMutation(async () => {
      await trainingApi.createExerciseDefinition(payload)
      notice.value = 'Exercício criado na biblioteca.'
    })
  }

  async function archiveExerciseDefinition(id: number) {
    return runMutation(async () => {
      await trainingApi.archiveExerciseDefinition(id)
      notice.value = 'Exercício arquivado.'
    })
  }

  async function startSession(planId: number, dayId: number) {
    return runMutation(async () => {
      activeSession.value = await trainingApi.startSession(planId, dayId, new Date().toISOString().slice(0, 10))
      notice.value = 'Sessão iniciada.'
    })
  }

  async function updateSessionSet(
    exerciseId: number,
    setId: number,
    payload: { reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string },
  ) {
    if (!activeSession.value) return false
    try {
      activeSession.value = await trainingApi.updateSet(activeSession.value.id, exerciseId, setId, payload)
      return true
    } catch (cause) {
      error.value = messageFrom(cause)
      return false
    }
  }

  async function addSessionSet(exerciseId: number) {
    if (!activeSession.value) return false
    activeSession.value = await trainingApi.addSessionSet(activeSession.value.id, exerciseId)
    return true
  }

  async function setSessionExerciseStatus(exerciseId: number, status: SessionExerciseStatus) {
    if (!activeSession.value) return false
    activeSession.value = await trainingApi.setSessionExerciseStatus(activeSession.value.id, exerciseId, status)
    return true
  }

  async function pauseOrResumeSession() {
    if (!activeSession.value) return
    activeSession.value = activeSession.value.status === 'PAUSED'
      ? await trainingApi.resumeSession(activeSession.value.id)
      : await trainingApi.pauseSession(activeSession.value.id)
  }

  async function completeActiveSession(overallRpe: number | null, notes: string) {
    if (!activeSession.value) return false
    return runMutation(async () => {
      await trainingApi.completeSession(activeSession.value!.id, overallRpe, notes)
      activeSession.value = null
      notice.value = 'Treino concluído e salvo no histórico.'
    })
  }

  async function abandonActiveSession(notes: string) {
    if (!activeSession.value) return false
    return runMutation(async () => {
      await trainingApi.abandonSession(activeSession.value!.id, notes)
      activeSession.value = null
      notice.value = 'Sessão encerrada.'
    })
  }

  async function runMutation(mutation: () => Promise<void>) {
    loading.value = true
    error.value = ''
    notice.value = ''
    try {
      await mutation()
      await refresh()
      return true
    } catch (cause) {
      error.value = messageFrom(cause)
      loading.value = false
      return false
    }
  }

  return {
    workouts,
    trainingPlans,
    exerciseLibrary,
    sessions,
    activeSession,
    dashboard,
    selectedWorkoutId,
    selectedWorkout,
    selectedTrainingPlanId,
    selectedTrainingPlan,
    loading,
    error,
    notice,
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
    duplicateTrainingPlan,
    archiveTrainingPlan,
    updatePlanDay,
    addDayExercise,
    removeDayExercise,
    addRestActivity,
    removeRestActivity,
    createExerciseDefinition,
    archiveExerciseDefinition,
    startSession,
    updateSessionSet,
    addSessionSet,
    setSessionExerciseStatus,
    pauseOrResumeSession,
    completeActiveSession,
    abandonActiveSession,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

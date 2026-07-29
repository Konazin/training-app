import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  DayExerciseInput,
  SessionExerciseStatus,
  SessionStatus,
  TrainingPlan,
  TrainingPlanInput,
  WorkoutSession,
  Workout,
  WorkoutInput,
} from '../models/training'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const API_TOKEN = import.meta.env.VITE_API_TOKEN

interface ApiErrorBody {
  message?: string
  fields?: Record<string, string>
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const fieldMessage = body.fields ? Object.values(body.fields)[0] : undefined
    throw new Error(fieldMessage ?? body.message ?? 'Não foi possível concluir a operação.')
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const trainingApi = {
  getDashboard: () => request<Dashboard>('/dashboard'),
  getWorkouts: () => request<Workout[]>('/workouts'),
  createWorkout: (payload: WorkoutInput) =>
    request<Workout>('/workouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteWorkout: (id: number) =>
    request<void>(`/workouts/${id}`, { method: 'DELETE' }),
  addExercise: (workoutId: number, payload: ExerciseInput) =>
    request<Workout>(`/workouts/${workoutId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteExercise: (workoutId: number, exerciseId: number) =>
    request<void>(`/workouts/${workoutId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    }),
  getTrainingPlans: () => request<TrainingPlan[]>('/training-plans'),
  createTrainingPlan: (payload: TrainingPlanInput) =>
    request<TrainingPlan>('/training-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteTrainingPlan: (id: number) =>
    request<void>(`/training-plans/${id}`, { method: 'DELETE' }),
  addPlanExercise: (planId: number, payload: ExerciseInput) =>
    request<TrainingPlan>(`/training-plans/${planId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePlanExercise: (planId: number, exerciseId: number) =>
    request<void>(`/training-plans/${planId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    }),
  activateTrainingPlan: (id: number) =>
    request<TrainingPlan>(`/training-plans/${id}/activate`, { method: 'POST' }),
  duplicateTrainingPlan: (id: number) =>
    request<TrainingPlan>(`/training-plans/${id}/duplicate`, { method: 'POST' }),
  archiveTrainingPlan: (id: number, archived = true) =>
    request<TrainingPlan>(`/training-plans/${id}/archive?archived=${archived}`, { method: 'PATCH' }),
  updatePlanDay: (
    planId: number,
    dayId: number,
    payload: { title: string; description: string; restDay: boolean; estimatedDurationMinutes: number; notes: string },
  ) => request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  addDayExercise: (planId: number, dayId: number, payload: DayExerciseInput) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeDayExercise: (planId: number, dayId: number, exerciseId: number) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/${exerciseId}`, { method: 'DELETE' }),
  reorderDayExercises: (planId: number, dayId: number, ids: number[]) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises/order`, {
      method: 'PUT',
      body: JSON.stringify(ids),
    }),
  addRestActivity: (
    planId: number,
    dayId: number,
    payload: { name: string; description: string; estimatedDurationMinutes: number; category: string; optional: boolean },
  ) => request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  removeRestActivity: (planId: number, dayId: number, activityId: number) =>
    request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities/${activityId}`, { method: 'DELETE' }),
  getExerciseLibrary: (params = '') =>
    request<{ content: ExerciseDefinition[] }>(
      `/exercise-library?size=100${params ? `&${params}` : ''}`,
    ).then((page) => page.content),
  createExerciseDefinition: (payload: ExerciseDefinitionInput) =>
    request<ExerciseDefinition>('/exercise-library', { method: 'POST', body: JSON.stringify(payload) }),
  updateExerciseDefinition: (id: number, payload: ExerciseDefinitionInput) =>
    request<ExerciseDefinition>(`/exercise-library/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveExerciseDefinition: (id: number, archived = true) =>
    request<ExerciseDefinition>(`/exercise-library/${id}/archive?archived=${archived}`, { method: 'PATCH' }),
  getSessions: (status?: SessionStatus) =>
    request<WorkoutSession[]>(`/sessions${status ? `?status=${status}` : ''}`),
  getActiveSession: () => request<WorkoutSession | undefined>('/sessions/active'),
  startSession: (trainingPlanId: number, planDayId: number, scheduledDate: string) =>
    request<WorkoutSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ trainingPlanId, planDayId, scheduledDate }),
    }),
  updateSet: (
    sessionId: number,
    exerciseId: number,
    setId: number,
    payload: { reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string },
  ) => request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  addSessionSet: (sessionId: number, exerciseId: number) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets`, { method: 'POST' }),
  setSessionExerciseStatus: (sessionId: number, exerciseId: number, status: SessionExerciseStatus) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/status?status=${status}`, { method: 'PATCH' }),
  pauseSession: (id: number) => request<WorkoutSession>(`/sessions/${id}/pause`, { method: 'POST' }),
  resumeSession: (id: number) => request<WorkoutSession>(`/sessions/${id}/resume`, { method: 'POST' }),
  completeSession: (id: number, overallRpe: number | null, notes: string) =>
    request<WorkoutSession>(`/sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ overallRpe, notes }),
    }),
  abandonSession: (id: number, notes: string) =>
    request<WorkoutSession>(`/sessions/${id}/abandon`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
}

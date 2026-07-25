import { API_URL } from '../config/api'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  SessionExerciseStatus,
  TrainingPlan,
  TrainingPlanInput,
  Workout,
  WorkoutSession,
  WorkoutInput,
} from '../models/training'

interface ApiErrorBody {
  message?: string
  fields?: Record<string, string>
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const fieldMessage = body.fields ? Object.values(body.fields)[0] : undefined
    throw new Error(fieldMessage ?? body.message ?? 'Não foi possível concluir a operação.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const trainingApi = {
  getDashboard: () => request<Dashboard>('/dashboard'),
  getWorkouts: () => request<Workout[]>('/workouts'),
  createWorkout: (payload: WorkoutInput) =>
    request<Workout>('/workouts', { method: 'POST', body: JSON.stringify(payload) }),
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
    request<TrainingPlan>('/training-plans', { method: 'POST', body: JSON.stringify(payload) }),
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
  updatePlanDay: (
    planId: number,
    dayId: number,
    payload: { title: string; description: string; restDay: boolean; estimatedDurationMinutes: number; notes: string },
  ) => request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  addDayExercise: (planId: number, dayId: number, payload: {
    exerciseDefinitionId: number; sets: number; minReps: number; maxReps: number
    plannedLoad: number; plannedDurationSeconds: number | null; plannedDistance: number
    restSeconds: number; plannedRpe: number | null; setType: string; notes: string; alternativeExerciseId: number | null
  }) => request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/exercises`, { method: 'POST', body: JSON.stringify(payload) }),
  addRestActivity: (planId: number, dayId: number, payload: {
    name: string; description: string; estimatedDurationMinutes: number; category: string; optional: boolean
  }) => request<TrainingPlan>(`/training-plans/${planId}/days/${dayId}/rest-activities`, { method: 'POST', body: JSON.stringify(payload) }),
  getExerciseLibrary: () => request<ExerciseDefinition[]>('/exercise-library'),
  createExerciseDefinition: (payload: ExerciseDefinitionInput) =>
    request<ExerciseDefinition>('/exercise-library', { method: 'POST', body: JSON.stringify(payload) }),
  getSessions: () => request<WorkoutSession[]>('/sessions'),
  getActiveSession: () => request<WorkoutSession | undefined>('/sessions/active'),
  startSession: (trainingPlanId: number, planDayId: number) =>
    request<WorkoutSession>('/sessions', { method: 'POST', body: JSON.stringify({ trainingPlanId, planDayId, scheduledDate: new Date().toISOString().slice(0, 10) }) }),
  updateSet: (sessionId: number, exerciseId: number, setId: number, payload: {
    reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string
  }) => request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setSessionExerciseStatus: (sessionId: number, exerciseId: number, status: SessionExerciseStatus) =>
    request<WorkoutSession>(`/sessions/${sessionId}/exercises/${exerciseId}/status?status=${status}`, { method: 'PATCH' }),
  completeSession: (id: number, overallRpe: number | null, notes: string) =>
    request<WorkoutSession>(`/sessions/${id}/complete`, { method: 'POST', body: JSON.stringify({ overallRpe, notes }) }),
  abandonSession: (id: number) => request<WorkoutSession>(`/sessions/${id}/abandon`, { method: 'POST', body: '{}' }),
}

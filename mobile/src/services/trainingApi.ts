import { apiClient } from '../config/api'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseLibraryPage,
  Workout,
  WorkoutInput,
} from '../models/training'

export const trainingApi = {
  getHealth: () => apiClient.request<{ status: string; database: string; version: string; timestamp: string }>('/health'),
  getDashboard: () => apiClient.request<Dashboard>('/dashboard'),
  getWorkouts: () => apiClient.request<Workout[]>('/workouts'),
  createWorkout: (payload: WorkoutInput) =>
    apiClient.request<Workout>('/workouts', { method: 'POST', body: JSON.stringify(payload) }),
  deleteWorkout: (id: number) =>
    apiClient.request<void>(`/workouts/${id}`, { method: 'DELETE' }),
  addExercise: (workoutId: number, payload: ExerciseInput) =>
    apiClient.request<Workout>(`/workouts/${workoutId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteExercise: (workoutId: number, exerciseId: number) =>
    apiClient.request<void>(`/workouts/${workoutId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    }),
  getExerciseLibrary: (params: {
    page?: number; size?: number; query?: string; muscle?: string; equipment?: string
    category?: string; source?: string; hasVideo?: boolean
  } = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value))
    })
    return apiClient.request<ExerciseLibraryPage>(`/exercise-library?${query}`)
  },
  getExerciseDefinition: (id: number) =>
    apiClient.request<ExerciseDefinition>(`/exercise-library/${id}`),
  createExerciseDefinition: (payload: ExerciseDefinitionInput) =>
    apiClient.request<ExerciseDefinition>('/exercise-library', { method: 'POST', body: JSON.stringify(payload) }),
}

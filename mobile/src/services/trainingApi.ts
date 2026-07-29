import { apiClient } from '../config/api'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  Workout,
  WorkoutInput,
} from '../models/training'

export const trainingApi = {
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
  getExerciseLibrary: () => apiClient.request<ExerciseDefinition[]>('/exercise-library'),
  createExerciseDefinition: (payload: ExerciseDefinitionInput) =>
    apiClient.request<ExerciseDefinition>('/exercise-library', { method: 'POST', body: JSON.stringify(payload) }),
}

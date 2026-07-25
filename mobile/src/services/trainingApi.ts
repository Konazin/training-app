import { request } from '../core/api/request'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  Workout,
  WorkoutInput,
} from '../models/training'

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
  getExerciseLibrary: () => request<ExerciseDefinition[]>('/exercise-library'),
  createExerciseDefinition: (payload: ExerciseDefinitionInput) =>
    request<ExerciseDefinition>('/exercise-library', { method: 'POST', body: JSON.stringify(payload) }),
}

import { request } from '../core/api/request'
import type {
  Dashboard,
  ExerciseInput,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  TrainingPlan,
  TrainingPlanInput,
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
}

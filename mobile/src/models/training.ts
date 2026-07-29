export type WorkoutStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
export type CustomStats = Record<string, unknown>

export interface Exercise {
  id: number
  name: string
  muscleGroup: string
  sets: number
  reps: number
  weightKg: number
  restSeconds: number
  customStats: CustomStats
  createdAt: string
}

export interface Workout {
  id: number
  name: string
  description: string
  scheduledDate: string
  status: WorkoutStatus
  durationMinutes: number
  calories: number
  customStats: CustomStats
  exercises: Exercise[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutInput {
  name: string
  description: string
  scheduledDate: string
  status: WorkoutStatus
  durationMinutes: number
  calories: number
  customStats: CustomStats
}

export interface ExerciseInput {
  name: string
  muscleGroup: string
  sets: number
  reps: number
  weightKg: number
  restSeconds: number
  customStats: CustomStats
}

export interface ExerciseDefinition {
  id: number; name: string; description: string; primaryMuscleGroup: string
  secondaryMuscleGroups: string[]; equipment: string; category: ExerciseCategory; difficulty: string
  instructions: string; notes: string; mediaUrl: string; unilateral: boolean; timed: boolean
  custom: boolean; archived: boolean; createdAt: string; updatedAt: string
}
export interface ExerciseDefinitionInput {
  name: string; description: string; primaryMuscleGroup: string; secondaryMuscleGroups: string[]
  equipment: string; category: ExerciseCategory; difficulty: string; instructions: string
  notes: string; mediaUrl: string; unilateral: boolean; timed: boolean
}
export interface Dashboard {
  totalWorkouts: number
  completedWorkouts: number
  totalExercises: number
  totalMinutes: number
  totalCalories: number
  recentWorkouts: Workout[]
  activePlanName: string | null
  nextWorkoutName: string | null
  nextPlanDayId: number | null
  completedSessions: number
  weeklySessions: number
  totalVolume: number
  adherence: number
}
import type { ExerciseCategory } from '@training/training-contracts'
export type { ExerciseCategory } from '@training/training-contracts'

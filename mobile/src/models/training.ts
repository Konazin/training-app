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
  source: 'SYSTEM' | 'CUSTOM' | 'WGER'; externalId: string | null; sourceUrl: string | null
  licenseName: string | null; licenseUrl: string | null; author: string | null
  media: ExerciseMedia[]; primaryVideo: ExerciseMedia | null; primaryImage: ExerciseMedia | null
  hasVideo: boolean; primaryVideoUrl: string | null; primaryImageUrl: string | null
  custom: boolean; archived: boolean; createdAt: string; updatedAt: string
}
export interface ExerciseMedia {
  id: number; type: 'IMAGE' | 'VIDEO'; source: 'CUSTOM' | 'WGER' | 'LEGACY'
  url: string; thumbnailUrl: string | null; mimeType: string | null; width: number | null
  height: number | null; durationSeconds: number | null; main: boolean
  licenseName: string | null; licenseUrl: string | null; author: string | null; sourceUrl: string | null
}
export interface ExerciseLibraryPage {
  content: ExerciseDefinition[]; page: number; size: number; totalElements: number
  totalPages: number; first: boolean; last: boolean
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

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

export interface TrainingPlan {
  id: number
  name: string
  description: string
  category: string
  difficulty: string
  active: boolean
  archived: boolean
  startDate: string | null
  endDate: string | null
  exercises: Exercise[]
  days: TrainingPlanDay[]
  createdAt: string
  updatedAt: string
}

export interface TrainingPlanInput {
  name: string
  description: string
  category: string
  difficulty: string
  startDate?: string | null
  endDate?: string | null
}

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type ExerciseCategory = 'STRENGTH' | 'HYPERTROPHY' | 'ENDURANCE' | 'CARDIO' | 'MOBILITY' | 'STRETCHING' | 'TECHNIQUE' | 'RECOVERY'
export type SetType = 'NORMAL' | 'WARM_UP' | 'DROP_SET' | 'BI_SET' | 'CIRCUIT' | 'TO_FAILURE' | 'CONTROLLED_TEMPO'

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
export interface DayExercise {
  id: number; exercise: ExerciseDefinition; sortOrder: number; sets: number; minReps: number; maxReps: number
  plannedLoad: number | null; plannedDurationSeconds: number | null; plannedDistance: number | null
  restSeconds: number; plannedRpe: number | null; setType: SetType; notes: string; alternativeExerciseId: number | null
}
export interface RestActivity {
  id: number; name: string; description: string; estimatedDurationMinutes: number; category: string; optional: boolean; sortOrder: number
}
export interface TrainingPlanDay {
  id: number; weekday: Weekday; title: string; description: string; sortOrder: number; restDay: boolean
  estimatedDurationMinutes: number; notes: string; exercises: DayExercise[]; restActivities: RestActivity[]
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

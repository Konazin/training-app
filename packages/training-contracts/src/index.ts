export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type ExerciseCategory =
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'ENDURANCE'
  | 'CARDIO'
  | 'MOBILITY'
  | 'STRETCHING'
  | 'TECHNIQUE'
  | 'RECOVERY'

export interface TrainingPlan {
  id: number
  name: string
  description: string
  category: string
  difficulty: string
  active: boolean
  archived: boolean
}

export interface RestActivity {
  id: number
  name: string
  description: string
  estimatedDurationMinutes: number
  category: string
  optional: boolean
  sortOrder: number
}

export interface TrainingPlanDay {
  id: number
  weekday: Weekday
  title: string
  description: string
  sortOrder: number
  restDay: boolean
  estimatedDurationMinutes: number
  notes: string
  restActivities: RestActivity[]
}

export type SessionStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
export type SessionExerciseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

export interface SetLog {
  id: number
  setNumber: number
  reps: number
  load: number
  durationSeconds: number
  distance: number
  rpe: number | null
  completed: boolean
  completedAt: string | null
  manuallyAdded: boolean
  notes: string
  volume: number
}

export interface SessionExercise {
  id: number
  exerciseDefinitionId: number
  name: string
  muscleGroup: string
  category: ExerciseCategory
  timed: boolean
  sortOrder: number
  plannedSets: number
  plannedMinReps: number
  plannedMaxReps: number
  restSeconds: number
  status: SessionExerciseStatus
  notes: string
  sets: SetLog[]
}

export interface WorkoutSession {
  id: number
  trainingPlanId: number
  planDayId: number
  workoutName: string
  scheduledDate: string
  startedAt: string
  completedAt: string | null
  pausedAt: string | null
  status: SessionStatus
  totalDurationSeconds: number
  overallRpe: number | null
  notes: string
  completedSets: number
  totalPlannedSets: number
  totalVolume: number
  exercises: SessionExercise[]
}

export interface SetLogInput {
  reps: number
  load: number
  durationSeconds: number
  distance: number
  rpe: number | null
  completed: boolean
  notes: string
}

export interface StartWorkoutSessionInput {
  trainingPlanId: number
  planDayId: number
  scheduledDate: string
}

export interface CompleteWorkoutSessionInput {
  overallRpe: number | null
  notes: string
}

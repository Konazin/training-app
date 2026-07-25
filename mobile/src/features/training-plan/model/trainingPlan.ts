import type { ExerciseDefinition } from '../../../models/training'

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type SetType =
  | 'NORMAL'
  | 'WARM_UP'
  | 'DROP_SET'
  | 'BI_SET'
  | 'CIRCUIT'
  | 'TO_FAILURE'
  | 'CONTROLLED_TEMPO'

export interface DayExercise {
  id: number
  exercise: ExerciseDefinition
  sortOrder: number
  sets: number
  minReps: number
  maxReps: number
  plannedLoad: number | null
  plannedDurationSeconds: number | null
  plannedDistance: number | null
  restSeconds: number
  plannedRpe: number | null
  setType: SetType
  notes: string
  alternativeExerciseId: number | null
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
  exercises: DayExercise[]
  restActivities: RestActivity[]
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

export interface TrainingPlanDayInput {
  title: string
  description: string
  restDay: boolean
  estimatedDurationMinutes: number
  notes: string
}

export interface DayExerciseConfigInput {
  sets: number
  minReps: number
  maxReps: number
  plannedLoad: number | null
  plannedDurationSeconds: number | null
  plannedDistance: number | null
  restSeconds: number
  plannedRpe: number | null
  setType: SetType
  notes: string
  alternativeExerciseId: number | null
}

export interface DayExerciseInput extends DayExerciseConfigInput {
  exerciseDefinitionId: number
}

export interface RestActivityInput {
  name: string
  description: string
  category: string
  estimatedDurationMinutes: number
  optional: boolean
}

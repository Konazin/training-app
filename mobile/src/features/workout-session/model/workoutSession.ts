export type SessionStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
export type SessionExerciseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
export type ExerciseCategory =
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'ENDURANCE'
  | 'CARDIO'
  | 'MOBILITY'
  | 'STRETCHING'
  | 'TECHNIQUE'
  | 'RECOVERY'

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

export interface RestTimerState {
  sessionId: number
  exerciseId: number
  setId: number
  endsAt: number
  paused: boolean
  pausedAt?: number
}

export function adjustRestTimer(
  timer: RestTimerState,
  seconds: number,
  now = Date.now(),
): RestTimerState {
  const floor = timer.paused ? timer.pausedAt ?? timer.endsAt : now
  return { ...timer, endsAt: Math.max(floor, timer.endsAt + seconds * 1000) }
}

export function resumeRestTimer(timer: RestTimerState, now = Date.now()): RestTimerState {
  if (!timer.paused) return timer
  const resumed = {
    ...timer,
    endsAt: timer.endsAt + now - (timer.pausedAt ?? now),
    paused: false,
  }
  delete resumed.pausedAt
  return resumed
}

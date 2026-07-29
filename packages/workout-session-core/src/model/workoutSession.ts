export type {
  CompleteWorkoutSessionInput,
  ExerciseCategory,
  SessionExercise,
  SessionExerciseStatus,
  SessionStatus,
  SetLog,
  SetLogInput,
  StartWorkoutSessionInput,
  WorkoutSession,
} from '@training/training-contracts'

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

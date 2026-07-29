import type {
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseMedia,
  SetLog,
  TrainingPlan,
  TrainingPlanDay,
  WorkoutSession,
} from '../model'
import { WEEKDAYS } from '../model'
import { DomainError } from '../errors'

export function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function validateExercise(input: ExerciseDefinitionInput) {
  if (!input.name.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o nome do exercício.')
  if (!input.primaryMuscleGroup.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o grupo muscular.')
  if (!input.equipment.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o equipamento.')
  return { ...input, name: input.name.trim() }
}

export function assertValidWeek(days: TrainingPlanDay[]) {
  if (days.length !== WEEKDAYS.length || new Set(days.map((day) => day.weekday)).size !== WEEKDAYS.length) {
    throw new DomainError('INVALID_TRAINING_WEEK', 'A ficha deve conter segunda a domingo sem repetição.')
  }
}

export function validatePlan(plan: TrainingPlan) {
  if (!plan.name.trim()) throw new DomainError('INVALID_TRAINING_PLAN', 'Informe o nome da ficha.')
  assertValidWeek(plan.days)
  for (const day of plan.days) {
    for (const exercise of day.exercises) {
      if (exercise.sets < 1 || exercise.minReps < 0 || exercise.maxReps < exercise.minReps || exercise.restSeconds < 0) {
        throw new DomainError('INVALID_EXERCISE_CONFIG', 'Configuração de exercício inválida.')
      }
    }
  }
  return plan
}

export function reorder<T extends { id: number; sortOrder: number }>(items: T[], ids: number[]) {
  if (ids.length !== items.length || new Set(ids).size !== items.length || ids.some((id) => !items.some((item) => item.id === id))) {
    throw new DomainError('INVALID_ORDER', 'A ordem deve conter todos os itens uma única vez.')
  }
  return ids.map((id, sortOrder) => ({ ...items.find((item) => item.id === id)!, sortOrder }))
}

export function selectPrimaryMedia(media: ExerciseMedia[], type: ExerciseMedia['type']) {
  const candidates = media.filter((item) => item.type === type)
  return candidates.find((item) => item.main)
    ?? [...candidates].sort((a, b) => a.sortOrder - b.sortOrder)[0]
    ?? null
}

export function resolvedMediaUrl(media: ExerciseMedia | null) {
  return media?.localUri ?? media?.remoteUrl ?? null
}

export function setVolume(set: Pick<SetLog, 'completed' | 'reps' | 'load'>) {
  return set.completed ? set.reps * set.load : 0
}

export function sessionVolume(session: WorkoutSession) {
  return session.exercises.flatMap((exercise) => exercise.sets).reduce((sum, set) => sum + setVolume(set), 0)
}

export function sessionDuration(session: WorkoutSession, now = new Date()) {
  const end = session.completedAt ? new Date(session.completedAt) : now
  return Math.max(0, Math.floor((end.getTime() - new Date(session.startedAt).getTime()) / 1000) - session.pausedDurationSeconds)
}

export function historyStats(sessions: WorkoutSession[], now = new Date()) {
  const completed = sessions.filter((session) => session.status === 'COMPLETED')
  const weekAgo = new Date(now)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  return {
    completedSessions: completed.length,
    weeklySessions: completed.filter((session) => new Date(session.startedAt) >= weekAgo).length,
    totalExercises: completed.reduce((sum, session) => sum + session.exercises.filter((item) => item.status === 'COMPLETED').length, 0),
    totalDurationSeconds: completed.reduce((sum, session) => sum + session.totalDurationSeconds, 0),
    totalVolume: completed.reduce((sum, session) => sum + session.totalVolume, 0),
  }
}

export function serializeJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

export function parseJson<T>(value: string, validate: (candidate: unknown) => candidate is T): T {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new DomainError('INVALID_JSON_DATA', 'Dados locais em JSON estão corrompidos.')
  }
  if (!validate(parsed)) throw new DomainError('INVALID_JSON_DATA', 'Dados locais em JSON são inválidos.')
  return parsed
}

export const isStringArray = (candidate: unknown): candidate is string[] =>
  Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')

export function applyMedia(exercise: Omit<ExerciseDefinition, 'primaryVideo' | 'primaryImage' | 'hasVideo' | 'primaryVideoUrl' | 'primaryImageUrl'>): ExerciseDefinition {
  const primaryVideo = selectPrimaryMedia(exercise.media, 'VIDEO')
  const primaryImage = selectPrimaryMedia(exercise.media, 'IMAGE')
  return {
    ...exercise,
    primaryVideo,
    primaryImage,
    hasVideo: primaryVideo !== null,
    primaryVideoUrl: resolvedMediaUrl(primaryVideo),
    primaryImageUrl: resolvedMediaUrl(primaryImage),
  }
}

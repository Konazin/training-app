import type {
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseMedia,
  DayExerciseConfigInput,
  RestActivityInput,
  SetLog,
  SetLogInput,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanDayInput,
  TrainingPlanInput,
  WorkoutSession,
} from '../model'
import { WEEKDAYS } from '../model'
import { DomainError } from '../errors'

export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function validateExercise(input: ExerciseDefinitionInput) {
  if (!input.name.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o nome do exercício.')
  if (!input.primaryMuscleGroup.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o grupo muscular.')
  if (!input.equipment.trim()) throw new DomainError('INVALID_EXERCISE', 'Informe o equipamento.')
  return { ...input, name: input.name.trim() }
}

export function validateOptionalNonNegativeNumber(value: number | null | undefined, field: string) {
  if (value == null) return null
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainError('INVALID_NUMBER', `${field} deve ser um número maior ou igual a zero.`)
  }
  return value
}

export function validateRpe(value: number | null | undefined) {
  if (value == null) return null
  if (!Number.isFinite(value) || value < 0 || value > 10) {
    throw new DomainError('INVALID_RPE', 'RPE deve estar entre 0 e 10.')
  }
  return value
}

export function validateTrainingPlanInput(input: TrainingPlanInput): TrainingPlanInput {
  const name = input.name.trim()
  const category = input.category.trim()
  const difficulty = input.difficulty.trim()
  if (!name) throw new DomainError('INVALID_TRAINING_PLAN', 'Informe o nome da ficha.')
  if (!category) throw new DomainError('INVALID_TRAINING_PLAN', 'Informe a categoria da ficha.')
  if (!difficulty) throw new DomainError('INVALID_TRAINING_PLAN', 'Informe a dificuldade da ficha.')
  if (name.length > 80) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'O nome deve ter no máximo 80 caracteres.')
  }
  if (input.description.trim().length > 500) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'A descrição deve ter no máximo 500 caracteres.')
  }
  if (category.length > 50 || difficulty.length > 50) {
    throw new DomainError(
      'INVALID_TRAINING_PLAN',
      'Categoria e dificuldade devem ter no máximo 50 caracteres.',
    )
  }
  if ((input.startDate && !isDateKey(input.startDate)) || (input.endDate && !isDateKey(input.endDate))) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'Informe datas válidas no formato AAAA-MM-DD.')
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'A data final não pode ser anterior à data inicial.')
  }
  return {
    ...input,
    name,
    description: input.description.trim(),
    category,
    difficulty,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

export function computeTrainingPlanPurgeAt(deletedAt: string, retentionDays = 7) {
  const timestamp = Date.parse(deletedAt)
  if (!isIsoUtc(deletedAt) || !Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new DomainError('INVALID_TRAINING_PLAN_LIFECYCLE', 'Ciclo de vida da ficha inválido.')
  }
  return new Date(timestamp + retentionDays * DAY_MS).toISOString()
}

export function trainingPlanTrashDaysRemaining(purgeAt: string, now = new Date()) {
  const purgeTimestamp = Date.parse(purgeAt)
  if (!isIsoUtc(purgeAt) || Number.isNaN(now.getTime())) {
    throw new DomainError('INVALID_TRAINING_PLAN_LIFECYCLE', 'Ciclo de vida da ficha inválido.')
  }
  return Math.max(0, Math.ceil((purgeTimestamp - now.getTime()) / DAY_MS))
}

export function trainingPlanTrashStatusLabel(purgeAt: string, now = new Date()) {
  const remainingMs = Date.parse(purgeAt) - now.getTime()
  if (!isIsoUtc(purgeAt) || Number.isNaN(now.getTime())) {
    throw new DomainError('INVALID_TRAINING_PLAN_LIFECYCLE', 'Ciclo de vida da ficha inválido.')
  }
  if (remainingMs <= 0) return 'Pronta para exclusão'
  if (remainingMs < DAY_MS) return 'Será apagada hoje'
  const days = Math.ceil(remainingMs / DAY_MS)
  return days === 1 ? 'Será apagada amanhã' : `Será apagada em ${days} dias`
}

export function validateTrainingPlanLifecycle(
  plan: Pick<TrainingPlan, 'active' | 'archived' | 'deletedAt' | 'purgeAt'>,
) {
  const hasDeletedAt = plan.deletedAt !== null
  const hasPurgeAt = plan.purgeAt !== null
  const invalidState = (plan.active && plan.archived)
    || (plan.active && hasDeletedAt)
    || (plan.archived && hasDeletedAt)
    || hasDeletedAt !== hasPurgeAt
  if (invalidState) {
    throw new DomainError('INVALID_TRAINING_PLAN_LIFECYCLE', 'Ciclo de vida da ficha inválido.')
  }
  if (hasDeletedAt) {
    if (!isIsoUtc(plan.deletedAt!) || !isIsoUtc(plan.purgeAt!)
      || Date.parse(plan.purgeAt!) - Date.parse(plan.deletedAt!) !== 7 * DAY_MS) {
      throw new DomainError('INVALID_TRAINING_PLAN_LIFECYCLE', 'Ciclo de vida da ficha inválido.')
    }
  }
  return plan
}

function isIsoUtc(value: string) {
  const timestamp = Date.parse(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    || Number.isNaN(timestamp)) return false
  const normalized = new Date(timestamp).toISOString()
  return value === normalized || value === normalized.replace('.000Z', 'Z')
}

export function validateTrainingPlanDayInput(input: TrainingPlanDayInput): TrainingPlanDayInput {
  const title = input.title.trim()
  if (!title) throw new DomainError('INVALID_TRAINING_DAY', 'Informe o título do dia.')
  validateOptionalNonNegativeNumber(input.estimatedDurationMinutes, 'Duração estimada')
  return { ...input, title, description: input.description.trim(), notes: input.notes.trim() }
}

export function validateDayExerciseInput<T extends DayExerciseConfigInput>(input: T): T {
  if (!Number.isInteger(input.sets) || input.sets < 1) {
    throw new DomainError('INVALID_EXERCISE_CONFIG', 'A quantidade de séries deve ser maior ou igual a 1.')
  }
  validateOptionalNonNegativeNumber(input.minReps, 'Repetições mínimas')
  validateOptionalNonNegativeNumber(input.maxReps, 'Repetições máximas')
  if (input.maxReps < input.minReps) {
    throw new DomainError('INVALID_EXERCISE_CONFIG', 'Repetições máximas não podem ser menores que as mínimas.')
  }
  validateOptionalNonNegativeNumber(input.plannedLoad, 'Carga planejada')
  validateOptionalNonNegativeNumber(input.plannedDurationSeconds, 'Duração planejada')
  validateOptionalNonNegativeNumber(input.plannedDistance, 'Distância planejada')
  validateOptionalNonNegativeNumber(input.restSeconds, 'Descanso')
  validateRpe(input.plannedRpe)
  return { ...input, notes: input.notes.trim() }
}

export function validateRestActivityInput(input: RestActivityInput): RestActivityInput {
  const name = input.name.trim()
  const category = input.category.trim()
  if (!name) throw new DomainError('INVALID_REST_ACTIVITY', 'Informe o nome da atividade.')
  if (!category) throw new DomainError('INVALID_REST_ACTIVITY', 'Informe a categoria da atividade.')
  validateOptionalNonNegativeNumber(input.estimatedDurationMinutes, 'Duração estimada')
  return { ...input, name, category, description: input.description.trim() }
}

export function validateSetLogInput(input: SetLogInput): SetLogInput {
  validateOptionalNonNegativeNumber(input.reps, 'Repetições')
  validateOptionalNonNegativeNumber(input.load, 'Carga')
  validateOptionalNonNegativeNumber(input.durationSeconds, 'Duração')
  validateOptionalNonNegativeNumber(input.distance, 'Distância')
  validateRpe(input.rpe)
  const notes = input.notes.trim()
  if (notes.length > 500) {
    throw new DomainError('INVALID_SET_LOG', 'A observação da série deve ter no máximo 500 caracteres.')
  }
  return { ...input, notes }
}

export function localDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) throw new DomainError('INVALID_DATE', 'Data local inválida.')
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year!, month! - 1, day!))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month! - 1
    && parsed.getUTCDate() === day
}

export function assertValidWeek(days: TrainingPlanDay[]) {
  if (days.length !== WEEKDAYS.length || new Set(days.map((day) => day.weekday)).size !== WEEKDAYS.length) {
    throw new DomainError('INVALID_TRAINING_WEEK', 'A ficha deve conter segunda a domingo sem repetição.')
  }
}

export function validatePlan(plan: TrainingPlan) {
  validateTrainingPlanInput(plan)
  validateTrainingPlanLifecycle(plan)
  assertValidWeek(plan.days)
  for (const day of plan.days) {
    validateTrainingPlanDayInput(day)
    day.exercises.forEach(validateDayExerciseInput)
    day.restActivities.forEach(validateRestActivityInput)
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
  const started = new Date(session.startedAt)
  if (
    Number.isNaN(started.getTime())
    || Number.isNaN(end.getTime())
    || end < started
    || !Number.isFinite(session.pausedDurationSeconds)
    || session.pausedDurationSeconds < 0
  ) {
    throw new DomainError('INVALID_SESSION_DURATION', 'Dados de duração da sessão são inválidos.')
  }
  const duration = Math.floor((end.getTime() - started.getTime()) / 1000) - session.pausedDurationSeconds
  if (duration < 0) throw new DomainError('INVALID_SESSION_DURATION', 'A duração da sessão não pode ser negativa.')
  return duration
}

export interface HistoryProgress {
  completedSessions: number
  completedThisWeek: number
  completionRate: number
  completedExercises: number
  totalDurationSeconds: number
  totalVolume: number
}

export function calculateHistoryProgress(
  sessions: readonly WorkoutSession[],
  now = new Date(),
): HistoryProgress {
  const completed = sessions.filter((session) => session.status === 'COMPLETED')
  const abandoned = sessions.filter((session) => session.status === 'ABANDONED')
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const start = localDateKey(monday)
  const end = localDateKey(sunday)
  return {
    completedSessions: completed.length,
    completedThisWeek: completed.filter(
      (session) => session.scheduledDate >= start && session.scheduledDate <= end,
    ).length,
    completionRate: completed.length + abandoned.length
      ? Math.round(completed.length / (completed.length + abandoned.length) * 100)
      : 0,
    completedExercises: completed.reduce(
      (total, session) =>
        total + session.exercises.filter((exercise) => exercise.status === 'COMPLETED').length,
      0,
    ),
    totalDurationSeconds: completed.reduce(
      (total, session) => total + session.totalDurationSeconds,
      0,
    ),
    totalVolume: completed.reduce((total, session) => total + session.totalVolume, 0),
  }
}

export function historyStats(sessions: WorkoutSession[], now = new Date()) {
  const progress = calculateHistoryProgress(sessions, now)
  return {
    completedSessions: progress.completedSessions,
    weeklySessions: progress.completedThisWeek,
    totalExercises: progress.completedExercises,
    totalDurationSeconds: progress.totalDurationSeconds,
    totalVolume: progress.totalVolume,
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

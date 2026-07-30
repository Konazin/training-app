import { DomainError, type BackupRepository, type TrainingBackup } from '@training/training-domain'
import type { BindValue, SqlDatabase } from '../database'
import { clearUserData, deleteUserRows } from '../database/installation'
import type { Row } from '../mappers'

export const BACKUP_LIMITS = {
  exercises: 10_000,
  media: 20_000,
  trainingPlans: 1_000,
  sessions: 20_000,
  setLogs: 500_000,
  fileBytes: 25 * 1024 * 1024,
} as const

const TABLES = {
  exercise_definitions: [
    'id', 'name', 'normalized_name', 'description', 'primary_muscle_group',
    'secondary_muscle_groups_json', 'equipment', 'category', 'difficulty',
    'instructions', 'notes', 'unilateral', 'timed', 'source', 'external_id',
    'source_url', 'license_name', 'license_url', 'author', 'archived', 'created_at', 'updated_at',
  ],
  exercise_media: [
    'id', 'exercise_definition_id', 'type', 'source', 'external_id', 'remote_url',
    'local_uri', 'thumbnail_remote_url', 'thumbnail_local_uri', 'mime_type', 'width',
    'height', 'duration_seconds', 'is_main', 'sort_order', 'license_name', 'license_url',
    'author', 'source_url', 'downloaded_at', 'created_at', 'updated_at',
  ],
  training_plans: [
    'id', 'name', 'description', 'category', 'difficulty', 'start_date', 'end_date',
    'active', 'archived', 'deleted_at', 'purge_at', 'created_at', 'updated_at',
  ],
  training_plan_days: [
    'id', 'training_plan_id', 'weekday', 'title', 'description', 'sort_order',
    'rest_day', 'estimated_duration_minutes', 'notes',
  ],
  training_day_exercises: [
    'id', 'training_plan_day_id', 'exercise_definition_id', 'sort_order', 'sets',
    'min_reps', 'max_reps', 'planned_load', 'planned_duration_seconds', 'planned_distance',
    'rest_seconds', 'planned_rpe', 'set_type', 'notes', 'alternative_exercise_id',
  ],
  rest_activities: [
    'id', 'training_plan_day_id', 'name', 'description', 'estimated_duration_minutes',
    'category', 'optional', 'sort_order',
  ],
  workout_sessions: [
    'id', 'training_plan_id', 'plan_day_id', 'workout_name', 'day_name', 'scheduled_date',
    'started_at', 'completed_at', 'paused_at', 'paused_duration_seconds', 'status',
    'active_slot', 'total_duration_seconds', 'overall_rpe', 'notes',
  ],
  workout_session_exercises: [
    'id', 'workout_session_id', 'exercise_definition_id', 'name', 'muscle_group',
    'category', 'timed', 'primary_video_url', 'primary_image_url',
    'primary_video_source_url', 'primary_video_license_name', 'primary_video_license_url',
    'primary_video_author', 'attribution', 'sort_order', 'planned_sets',
    'planned_min_reps', 'planned_max_reps', 'planned_load', 'planned_duration_seconds',
    'planned_distance', 'rest_seconds', 'set_type', 'status', 'notes',
  ],
  workout_set_logs: [
    'id', 'workout_session_exercise_id', 'set_number', 'reps', 'load',
    'duration_seconds', 'distance', 'rpe', 'completed', 'completed_at',
    'manually_added', 'notes',
  ],
  app_settings: ['key', 'value_json', 'updated_at'],
} as const

export function createBackupRepository(database: SqlDatabase): BackupRepository {
  return {
    export: (appVersion) => exportBackup(database, appVersion),
    restore: async (backup) => {
      validateBackup(backup)
      await database.transaction(async (transaction) => {
        await deleteUserRows(transaction)
        await insertRows(transaction, 'exercise_definitions', backup.exercises)
        await insertRows(transaction, 'exercise_media', backup.media)
        await insertRows(transaction, 'training_plans', backup.trainingPlans)
        await insertRows(transaction, 'training_plan_days', backup.trainingPlanDays)
        await insertRows(transaction, 'training_day_exercises', backup.trainingDayExercises)
        await insertRows(transaction, 'rest_activities', backup.restActivities)
        await insertRows(transaction, 'workout_sessions', backup.sessions)
        await insertRows(transaction, 'workout_session_exercises', backup.sessionExercises)
        await insertRows(transaction, 'workout_set_logs', backup.setLogs)
        await insertRows(transaction, 'app_settings', backup.settings)
        await transaction.run(`
          DELETE FROM training_plans
          WHERE deleted_at IS NOT NULL AND julianday(purge_at) <= julianday(?)
            AND NOT EXISTS (
              SELECT 1 FROM workout_sessions session
              WHERE session.training_plan_id = training_plans.id
                AND session.status IN ('IN_PROGRESS','PAUSED')
            )
        `, new Date().toISOString())
      })
    },
    reset: () => clearUserData(database),
  }
}

export async function exportBackup(database: SqlDatabase, appVersion: string): Promise<TrainingBackup> {
  const [
    exercises, media, trainingPlans, trainingPlanDays, trainingDayExercises,
    restActivities, sessions, sessionExercises, setLogs, settings,
  ] = await Promise.all([
    database.all<Row>('SELECT * FROM exercise_definitions ORDER BY id'),
    database.all<Row>('SELECT * FROM exercise_media ORDER BY id'),
    database.all<Row>('SELECT * FROM training_plans ORDER BY id'),
    database.all<Row>('SELECT * FROM training_plan_days ORDER BY id'),
    database.all<Row>('SELECT * FROM training_day_exercises ORDER BY id'),
    database.all<Row>('SELECT * FROM rest_activities ORDER BY id'),
    database.all<Row>('SELECT * FROM workout_sessions ORDER BY id'),
    database.all<Row>('SELECT * FROM workout_session_exercises ORDER BY id'),
    database.all<Row>('SELECT * FROM workout_set_logs ORDER BY id'),
    database.all<Row>(`SELECT * FROM app_settings WHERE key NOT LIKE 'secret.%' ORDER BY key`),
  ])
  return {
    schemaVersion: 2,
    appVersion,
    exportedAt: new Date().toISOString(),
    exercises,
    media,
    trainingPlans,
    trainingPlanDays,
    trainingDayExercises,
    restActivities,
    sessions,
    sessionExercises,
    setLogs,
    settings,
  }
}

export function validateBackup(candidate: unknown): asserts candidate is TrainingBackup {
  assertPlainObject(candidate, 'arquivo não é um objeto JSON')
  const backup = candidate as Partial<TrainingBackup>
  if (backup.schemaVersion !== 1 && backup.schemaVersion !== 2) {
    throw invalidBackup('versão não suportada')
  }
  if ('app_metadata' in candidate || 'appMetadata' in candidate) {
    throw invalidBackup('app_metadata não pode ser importado')
  }
  const limits: Partial<Record<keyof TrainingBackup, number>> = {
    exercises: BACKUP_LIMITS.exercises,
    media: BACKUP_LIMITS.media,
    trainingPlans: BACKUP_LIMITS.trainingPlans,
    trainingPlanDays: BACKUP_LIMITS.trainingPlans * 7,
    trainingDayExercises: BACKUP_LIMITS.media,
    restActivities: BACKUP_LIMITS.media,
    sessions: BACKUP_LIMITS.sessions,
    sessionExercises: BACKUP_LIMITS.setLogs,
    setLogs: BACKUP_LIMITS.setLogs,
    settings: 10_000,
  }
  for (const [key, limit] of Object.entries(limits)) {
    const rows = backup[key as keyof TrainingBackup]
    if (!Array.isArray(rows)) throw invalidBackup(`coleção ${key} ausente`)
    if (rows.length > limit!) throw invalidBackup(`coleção ${key} excede o limite`)
    rows.forEach((row) => assertPlainObject(row, `linha inválida em ${key}`))
  }
  if (typeof backup.appVersion !== 'string' || !isIsoTimestamp(backup.exportedAt)) {
    throw invalidBackup('metadados inválidos')
  }

  const ids = (rows: unknown[], collection: string) => uniqueIds(rows, collection)
  const exerciseIds = ids(backup.exercises!, 'exercises')
  ids(backup.media!, 'media')
  const planIds = ids(backup.trainingPlans!, 'trainingPlans')
  const dayIds = ids(backup.trainingPlanDays!, 'trainingPlanDays')
  ids(backup.trainingDayExercises!, 'trainingDayExercises')
  ids(backup.restActivities!, 'restActivities')
  const sessionIds = ids(backup.sessions!, 'sessions')
  const sessionExerciseIds = ids(backup.sessionExercises!, 'sessionExercises')
  ids(backup.setLogs!, 'setLogs')
  requireReferences(backup.media!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.trainingPlanDays!, 'training_plan_id', planIds)
  requireReferences(backup.trainingDayExercises!, 'training_plan_day_id', dayIds)
  requireReferences(backup.trainingDayExercises!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.restActivities!, 'training_plan_day_id', dayIds)
  requireReferences(backup.sessionExercises!, 'workout_session_id', sessionIds)
  requireReferences(backup.setLogs!, 'workout_session_exercise_id', sessionExerciseIds)

  assertEnums(backup)
  assertFiniteNumbers(backup)
  assertDates(backup)
  assertUniqueOrder(backup.trainingPlanDays!, 'training_plan_id', 'sort_order')
  assertUniqueOrder(backup.trainingDayExercises!, 'training_plan_day_id', 'sort_order')
  assertUniqueOrder(backup.restActivities!, 'training_plan_day_id', 'sort_order')
  assertUniqueOrder(backup.sessionExercises!, 'workout_session_id', 'sort_order')
  assertUniqueOrder(backup.setLogs!, 'workout_session_exercise_id', 'set_number')
  for (const planId of planIds) {
    const days = backup.trainingPlanDays!.filter((row) => value(row, 'training_plan_id') === planId)
    if (days.length !== 7 || new Set(days.map((row) => value(row, 'weekday'))).size !== 7) {
      throw invalidBackup('cada ficha deve possuir sete dias únicos')
    }
  }
  if (backup.trainingPlans!.filter((row) => value(row, 'active') === 1).length > 1) {
    throw invalidBackup('mais de uma ficha ativa')
  }
  assertTrainingPlanLifecycle(backup.trainingPlans!, backup.schemaVersion)
  const active = backup.sessions!.filter((row) => value(row, 'active_slot') === 1)
  if (active.length > 1) throw invalidBackup('mais de uma sessão ativa')
  for (const row of backup.sessions!) {
    const status = value(row, 'status')
    const slot = value(row, 'active_slot')
    const shouldBeActive = status === 'IN_PROGRESS' || status === 'PAUSED'
    if ((shouldBeActive && slot !== 1) || (!shouldBeActive && slot != null)) {
      throw invalidBackup('active_slot incompatível com o status da sessão')
    }
  }
  if (backup.settings!.some((row) => String(value(row, 'key')).startsWith('secret.'))) {
    throw invalidBackup('segredos não podem ser importados')
  }
}

async function insertRows(
  database: SqlDatabase,
  table: keyof typeof TABLES,
  rows: unknown[],
) {
  const columns = TABLES[table]
  const sql = `INSERT INTO ${table}(${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw invalidBackup(`linha inválida em ${table}`)
    await database.run(
      sql,
      ...columns.map((column) => {
        const candidate = (row as Record<string, unknown>)[column]
        return (candidate === undefined ? null : candidate) as BindValue
      }),
    )
  }
}

function rowId(row: unknown) {
  const id = value(row, 'id')
  if (!Number.isInteger(id) || Number(id) <= 0) throw invalidBackup('ID inválido')
  return Number(id)
}

function uniqueIds(rows: unknown[], collection: string) {
  const result = new Set<number>()
  for (const row of rows) {
    const id = rowId(row)
    if (result.has(id)) throw invalidBackup(`ID duplicado em ${collection}`)
    result.add(id)
  }
  return result
}

function value(row: unknown, key: string) {
  if (!row || typeof row !== 'object') throw invalidBackup('linha inválida')
  return (row as Record<string, unknown>)[key]
}

function requireReferences(rows: unknown[], field: string, knownIds: Set<number>) {
  for (const row of rows) {
    const reference = value(row, field)
    if (typeof reference !== 'number' || !Number.isInteger(reference)) {
      throw invalidBackup(`referência inválida em ${field}`)
    }
    if (!knownIds.has(reference)) throw invalidBackup(`referência inválida em ${field}`)
  }
}

function assertPlainObject(value: unknown, reason: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidBackup(reason)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw invalidBackup('objeto com prototype inesperado')
}

function assertEnums(backup: Partial<TrainingBackup>) {
  enumRows(backup.exercises!, 'category', ['STRENGTH', 'HYPERTROPHY', 'ENDURANCE', 'CARDIO', 'MOBILITY', 'STRETCHING', 'TECHNIQUE', 'RECOVERY'])
  enumRows(backup.exercises!, 'source', ['SYSTEM', 'CUSTOM', 'WGER'])
  enumRows(backup.media!, 'type', ['IMAGE', 'VIDEO'])
  enumRows(backup.media!, 'source', ['SYSTEM', 'CUSTOM', 'WGER', 'LEGACY'])
  enumRows(backup.trainingPlanDays!, 'weekday', ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
  enumRows(backup.trainingDayExercises!, 'set_type', ['NORMAL', 'WARM_UP', 'DROP_SET', 'BI_SET', 'CIRCUIT', 'TO_FAILURE', 'CONTROLLED_TEMPO'])
  enumRows(backup.sessions!, 'status', ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'])
  enumRows(backup.sessionExercises!, 'status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'])
  enumRows(backup.sessionExercises!, 'set_type', ['NORMAL', 'WARM_UP', 'DROP_SET', 'BI_SET', 'CIRCUIT', 'TO_FAILURE', 'CONTROLLED_TEMPO'])
}

function enumRows(rows: unknown[], field: string, allowed: string[]) {
  for (const row of rows) {
    if (!allowed.includes(String(value(row, field)))) throw invalidBackup(`enum inválido em ${field}`)
  }
}

function assertFiniteNumbers(backup: Partial<TrainingBackup>) {
  const collections = [
    backup.exercises!, backup.media!, backup.trainingPlans!, backup.trainingPlanDays!,
    backup.trainingDayExercises!, backup.restActivities!, backup.sessions!,
    backup.sessionExercises!, backup.setLogs!,
  ]
  const numericFields = new Set([
    'id', 'exercise_definition_id', 'training_plan_id', 'training_plan_day_id',
    'plan_day_id', 'workout_session_id', 'workout_session_exercise_id', 'sort_order',
    'set_number', 'sets', 'min_reps', 'max_reps', 'planned_load',
    'planned_duration_seconds', 'planned_distance', 'rest_seconds', 'planned_rpe',
    'estimated_duration_minutes', 'paused_duration_seconds', 'total_duration_seconds',
    'overall_rpe', 'planned_sets', 'planned_min_reps', 'planned_max_reps',
    'reps', 'load', 'duration_seconds', 'distance', 'rpe', 'width', 'height',
    'active_slot', 'active', 'archived', 'rest_day', 'optional', 'completed',
    'manually_added', 'unilateral', 'timed', 'is_main',
  ])
  const nonNegative = new Set([
    'sort_order', 'set_number', 'sets', 'min_reps', 'max_reps', 'planned_load',
    'planned_duration_seconds', 'planned_distance', 'rest_seconds',
    'estimated_duration_minutes', 'paused_duration_seconds', 'total_duration_seconds',
    'planned_sets', 'planned_min_reps', 'planned_max_reps', 'reps', 'load',
    'duration_seconds', 'distance', 'width', 'height',
  ])
  for (const rows of collections) {
    for (const row of rows as Record<string, unknown>[]) {
      for (const [field, candidate] of Object.entries(row)) {
        if (!numericFields.has(field) || candidate == null) continue
        if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
          throw invalidBackup(`número inválido em ${field}`)
        }
        if (nonNegative.has(field) && candidate < 0) throw invalidBackup(`número negativo em ${field}`)
        if ((field === 'rpe' || field === 'planned_rpe' || field === 'overall_rpe') && (candidate < 0 || candidate > 10)) {
          throw invalidBackup(`RPE inválido em ${field}`)
        }
      }
    }
  }
}

function assertDates(backup: Partial<TrainingBackup>) {
  const timestampFields = [
    'created_at', 'updated_at', 'downloaded_at', 'started_at', 'completed_at',
    'paused_at', 'deleted_at', 'purge_at',
  ]
  const dateFields = ['start_date', 'end_date', 'scheduled_date']
  const rows = [
    ...backup.exercises!, ...backup.media!, ...backup.trainingPlans!, ...backup.sessions!,
  ] as Record<string, unknown>[]
  for (const row of rows) {
    for (const field of timestampFields) {
      const candidate = row[field]
      if (candidate != null && !isIsoTimestamp(candidate)) throw invalidBackup(`data inválida em ${field}`)
    }
    for (const field of dateFields) {
      const candidate = row[field]
      if (candidate != null && !isDateKey(candidate)) {
        throw invalidBackup(`data inválida em ${field}`)
      }
    }
  }
}

function assertTrainingPlanLifecycle(rows: unknown[], schemaVersion: 1 | 2) {
  for (const row of rows) {
    const record = row as Record<string, unknown>
    if (schemaVersion === 2 && (!('deleted_at' in record) || !('purge_at' in record))) {
      throw invalidBackup('ciclo de vida da ficha ausente')
    }
    const active = value(row, 'active') === 1
    const archived = value(row, 'archived') === 1
    const deletedAt = value(row, 'deleted_at') ?? null
    const purgeAt = value(row, 'purge_at') ?? null
    const trashed = deletedAt !== null || purgeAt !== null
    if (
      (active && archived)
      || (active && trashed)
      || (archived && trashed)
      || (deletedAt === null) !== (purgeAt === null)
      || (deletedAt !== null && (
        !isIsoTimestamp(deletedAt)
        || !isIsoTimestamp(purgeAt)
        || Date.parse(String(purgeAt)) - Date.parse(String(deletedAt)) !== 7 * 24 * 60 * 60 * 1000
      ))
    ) throw invalidBackup('ciclo de vida da ficha inválido')
  }
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year!, month! - 1, day!))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month! - 1
    && parsed.getUTCDate() === day
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return false
  const normalized = new Date(timestamp).toISOString()
  return value === normalized || value === normalized.replace('.000Z', 'Z')
}

function assertUniqueOrder(rows: unknown[], ownerField: string, orderField: string) {
  const seen = new Set<string>()
  for (const row of rows) {
    const owner = value(row, ownerField)
    const order = value(row, orderField)
    const key = `${String(owner)}:${String(order)}`
    if (seen.has(key)) throw invalidBackup(`${orderField} duplicado por proprietário`)
    seen.add(key)
  }
}

function invalidBackup(reason: string) {
  return new DomainError('INVALID_BACKUP', `Backup inválido: ${reason}.`)
}

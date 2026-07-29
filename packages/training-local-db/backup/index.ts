import { DomainError, type BackupRepository, type TrainingBackup } from '@training/training-domain'
import type { BindValue, SqlDatabase } from '../database'
import type { Row } from '../mappers'

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
    'active', 'archived', 'created_at', 'updated_at',
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
        await clearUserData(transaction)
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
      })
    },
    reset: () => database.transaction(clearUserData),
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
    schemaVersion: 1,
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
  if (!candidate || typeof candidate !== 'object') throw invalidBackup('arquivo não é um objeto JSON')
  const backup = candidate as Partial<TrainingBackup>
  if (backup.schemaVersion !== 1) throw invalidBackup('versão não suportada')
  const arrays: Array<keyof TrainingBackup> = [
    'exercises', 'media', 'trainingPlans', 'trainingPlanDays', 'trainingDayExercises',
    'restActivities', 'sessions', 'sessionExercises', 'setLogs', 'settings',
  ]
  if (arrays.some((key) => !Array.isArray(backup[key]))) throw invalidBackup('coleções obrigatórias ausentes')
  if (typeof backup.appVersion !== 'string' || Number.isNaN(Date.parse(backup.exportedAt ?? ''))) {
    throw invalidBackup('metadados inválidos')
  }

  const ids = (rows: unknown[]) => new Set(rows.map((row) => rowId(row)))
  const exerciseIds = ids(backup.exercises!)
  const planIds = ids(backup.trainingPlans!)
  const dayIds = ids(backup.trainingPlanDays!)
  const sessionIds = ids(backup.sessions!)
  const sessionExerciseIds = ids(backup.sessionExercises!)
  requireReferences(backup.media!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.trainingPlanDays!, 'training_plan_id', planIds)
  requireReferences(backup.trainingDayExercises!, 'training_plan_day_id', dayIds)
  requireReferences(backup.trainingDayExercises!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.restActivities!, 'training_plan_day_id', dayIds)
  requireReferences(backup.sessionExercises!, 'workout_session_id', sessionIds)
  requireReferences(backup.setLogs!, 'workout_session_exercise_id', sessionExerciseIds)

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

async function clearUserData(database: SqlDatabase) {
  await database.exec(`
    DELETE FROM workout_set_logs;
    DELETE FROM workout_session_exercises;
    DELETE FROM workout_sessions;
    DELETE FROM rest_activities;
    DELETE FROM training_day_exercises;
    DELETE FROM training_plan_days;
    DELETE FROM training_plans;
    DELETE FROM exercise_media;
    DELETE FROM exercise_definitions;
    DELETE FROM app_settings;
  `)
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

function value(row: unknown, key: string) {
  if (!row || typeof row !== 'object') throw invalidBackup('linha inválida')
  return (row as Record<string, unknown>)[key]
}

function requireReferences(rows: unknown[], field: string, knownIds: Set<number>) {
  for (const row of rows) {
    const reference = Number(value(row, field))
    if (!knownIds.has(reference)) throw invalidBackup(`referência inválida em ${field}`)
  }
}

function invalidBackup(reason: string) {
  return new DomainError('INVALID_BACKUP', `Backup inválido: ${reason}.`)
}

import {
  DomainError,
  LOCAL_PREFERENCES_KEY,
  resolveDisplayName,
  validateNutritionGoals,
  MICRONUTRIENT_CODES,
  type BackupRepository,
  type TrainingBackup,
} from '@training/training-domain'
import type { BindValue, SqlDatabase } from '../database'
import { clearUserData, deleteUserRows } from '../database/installation'
import { retireLegacyGeneratedExercises } from '../database/legacyCatalog'
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
    'user_notes', 'substitute_exercise_definition_id', 'substitute_name', 'substitution_reason',
  ],
  workout_set_logs: [
    'id', 'workout_session_exercise_id', 'set_number', 'reps', 'load',
    'duration_seconds', 'distance', 'rpe', 'completed', 'completed_at',
    'manually_added', 'notes',
  ],
  app_settings: ['key', 'value_json', 'updated_at'],
  exercise_aliases: ['id', 'exercise_id', 'alias', 'normalized_alias', 'origin'],
  exercise_favorites: ['exercise_id', 'created_at'],
  exercise_recent_usage: ['exercise_id', 'last_used_at', 'use_count'],
  nutrition_meals: ['id', 'local_date', 'consumed_at', 'meal_type', 'title', 'notes', 'source', 'created_at', 'updated_at'],
  nutrition_meal_items: ['id', 'meal_id', 'name', 'portion_description', 'estimated_grams', 'calories_kcal', 'protein_grams', 'carbohydrates_grams', 'fat_grams', 'fiber_grams', 'micronutrients_json', 'confidence', 'data_source', 'sort_order', 'created_at', 'updated_at'],
  nutrition_daily_summaries: ['id', 'local_date', 'total_calories_kcal', 'total_protein_grams', 'total_carbohydrates_grams', 'total_fat_grams', 'total_fiber_grams', 'total_micronutrients_json', 'meal_count', 'item_count', 'goal_calories_kcal', 'goal_protein_grams', 'goal_carbohydrates_grams', 'goal_fat_grams', 'goal_fiber_grams', 'closed_at', 'finalized', 'details_purged_at', 'updated_at'],
} as const

export function createBackupRepository(database: SqlDatabase): BackupRepository {
  return {
    export: (appVersion) => exportBackup(database, appVersion),
    restore: async (backup) => {
      await database.transaction(async (transaction) => {
        validateBackup(backup)
        await deleteUserRows(transaction)
        await insertRows(transaction, 'exercise_definitions', backup.exercises)
        await insertRows(transaction, 'exercise_aliases', backup.exerciseAliases ?? [])
        await insertRows(transaction, 'exercise_favorites', backup.exerciseFavorites ?? [])
        await insertRows(transaction, 'exercise_recent_usage', backup.exerciseRecentUsage ?? [])
        await insertRows(transaction, 'exercise_media', backup.media)
        await insertRows(transaction, 'training_plans', backup.trainingPlans)
        await insertRows(transaction, 'training_plan_days', backup.trainingPlanDays)
        await insertRows(transaction, 'training_day_exercises', backup.trainingDayExercises)
        await insertRows(transaction, 'rest_activities', backup.restActivities)
        await insertRows(transaction, 'workout_sessions', backup.sessions)
        await insertRows(transaction, 'workout_session_exercises', backup.sessionExercises)
        await insertRows(transaction, 'workout_set_logs', backup.setLogs)
        await insertRows(transaction, 'app_settings', normalizeLocalPreferenceRows(backup.settings))
        await insertRows(transaction, 'nutrition_meals', backup.nutritionMeals ?? [])
        await insertRows(transaction, 'nutrition_meal_items', backup.nutritionMealItems ?? [])
        await insertRows(transaction, 'nutrition_daily_summaries', (backup.nutritionDailySummaries ?? []).map((row) => ({ finalized: 0, details_purged_at: null, ...(row as object) })))
        await transaction.run(`
          DELETE FROM training_plans
          WHERE deleted_at IS NOT NULL AND julianday(purge_at) <= julianday(?)
            AND NOT EXISTS (
              SELECT 1 FROM workout_sessions session
              WHERE session.training_plan_id = training_plans.id
                AND session.status IN ('IN_PROGRESS','PAUSED')
            )
        `, new Date().toISOString())
        await retireLegacyGeneratedExercises(transaction)
      })
    },
    reset: () => clearUserData(database),
  }
}

function normalizeLocalPreferenceRows(rows: unknown[]) {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const candidate = row as Record<string, unknown>
    if (candidate.key !== LOCAL_PREFERENCES_KEY) return row
    let preferences: unknown = null
    try {
      preferences = typeof candidate.value_json === 'string'
        ? JSON.parse(candidate.value_json)
        : null
    } catch {
      preferences = null
    }
    return {
      ...candidate,
      value_json: JSON.stringify({ displayName: resolveDisplayName(preferences) }),
    }
  })
}

export async function exportBackup(database: SqlDatabase, appVersion: string): Promise<TrainingBackup> {
  const [
    exercises, media, trainingPlans, trainingPlanDays, trainingDayExercises,
    restActivities, sessions, sessionExercises, setLogs, settings,
    exerciseAliases, exerciseFavorites, exerciseRecentUsage, nutritionMeals, nutritionMealItems, nutritionDailySummaries,
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
    database.all<Row>(`SELECT * FROM exercise_aliases WHERE origin = 'USER' ORDER BY id`),
    database.all<Row>('SELECT * FROM exercise_favorites ORDER BY exercise_id'),
    database.all<Row>('SELECT * FROM exercise_recent_usage ORDER BY last_used_at DESC'),
    database.all<Row>('SELECT * FROM nutrition_meals ORDER BY id'),
    database.all<Row>('SELECT * FROM nutrition_meal_items ORDER BY meal_id, sort_order, id'),
    database.all<Row>('SELECT * FROM nutrition_daily_summaries ORDER BY local_date'),
  ])
  return {
    schemaVersion: 3,
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
    exerciseAliases,
    exerciseFavorites,
    exerciseRecentUsage,
    nutritionMeals, nutritionMealItems, nutritionDailySummaries,
  }
}

export function validateBackup(candidate: unknown): asserts candidate is TrainingBackup {
  assertPlainObject(candidate, 'arquivo não é um objeto JSON')
  const backup = candidate as Partial<TrainingBackup>
  if (backup.schemaVersion !== 1 && backup.schemaVersion !== 2 && backup.schemaVersion !== 3) {
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
  for (const [key, limit] of [['nutritionMeals', BACKUP_LIMITS.sessions], ['nutritionMealItems', BACKUP_LIMITS.setLogs], ['nutritionDailySummaries', BACKUP_LIMITS.sessions]] as const) {
    const rows = backup[key]
    if (rows !== undefined && (!Array.isArray(rows) || rows.length > limit)) throw invalidBackup(`coleção ${key} inválida`)
    rows?.forEach((row) => assertPlainObject(row, `linha inválida em ${key}`))
  }
  for (const [key, limit] of Object.entries(limits)) {
    const rows = backup[key as keyof TrainingBackup]
    if (!Array.isArray(rows)) throw invalidBackup(`coleção ${key} ausente`)
    if (rows.length > limit!) throw invalidBackup(`coleção ${key} excede o limite`)
    rows.forEach((row) => assertPlainObject(row, `linha inválida em ${key}`))
  }
  for (const [key, limit] of [
    ['exerciseAliases', BACKUP_LIMITS.exercises * 20],
    ['exerciseFavorites', BACKUP_LIMITS.exercises],
    ['exerciseRecentUsage', BACKUP_LIMITS.exercises],
  ] as const) {
    const rows = backup[key]
    if (rows === undefined) continue
    if (!Array.isArray(rows) || rows.length > limit) throw invalidBackup(`coleção opcional ${key} inválida`)
    rows.forEach((row) => assertPlainObject(row, `linha inválida em ${key}`))
  }
  if (backup.uiPreferences !== undefined && !isUiPreferences(backup.uiPreferences)) {
    throw invalidBackup('preferências de interface inválidas')
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
  const nutritionMealIds = ids(backup.nutritionMeals ?? [], 'nutritionMeals')
  ids(backup.nutritionMealItems ?? [], 'nutritionMealItems')
  ids(backup.nutritionDailySummaries ?? [], 'nutritionDailySummaries')
  requireReferences(backup.media!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.trainingPlanDays!, 'training_plan_id', planIds)
  requireReferences(backup.trainingDayExercises!, 'training_plan_day_id', dayIds)
  requireReferences(backup.trainingDayExercises!, 'exercise_definition_id', exerciseIds)
  requireReferences(backup.restActivities!, 'training_plan_day_id', dayIds)
  requireReferences(backup.sessionExercises!, 'workout_session_id', sessionIds)
  requireReferences(backup.setLogs!, 'workout_session_exercise_id', sessionExerciseIds)
  requireReferences(backup.nutritionMealItems ?? [], 'meal_id', nutritionMealIds)
  requireReferences(backup.exerciseAliases ?? [], 'exercise_id', exerciseIds)
  requireReferences(backup.exerciseFavorites ?? [], 'exercise_id', exerciseIds)
  requireReferences(backup.exerciseRecentUsage ?? [], 'exercise_id', exerciseIds)

  assertEnums(backup)
  assertNutritionRows(backup)
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
  assertLibraryOptionalRows(backup)
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

function isUiPreferences(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const input = value as Record<string, unknown>
  return ['DARK_BLUE', 'MONOCHROME', 'DRACULA', 'WHITE_BLUE'].includes(String(input.themePreset))
    && ['SYSTEM', 'LIGHT', 'DARK'].includes(String(input.appearance))
    && ['SYSTEM', 'FULL', 'REDUCED', 'OFF'].includes(String(input.motion))
    && typeof input.workoutHighContrast === 'boolean'
    && typeof input.hapticsEnabled === 'boolean'
}

function assertLibraryOptionalRows(backup: Partial<TrainingBackup>) {
  const aliases = backup.exerciseAliases ?? []
  const favorites = backup.exerciseFavorites ?? []
  const recents = backup.exerciseRecentUsage ?? []
  const aliasKeys = new Set<string>()
  for (const row of aliases) {
    if (
      typeof value(row, 'alias') !== 'string'
      || typeof value(row, 'normalized_alias') !== 'string'
      || value(row, 'origin') !== 'USER'
    ) throw invalidBackup('alias opcional inválido')
    const key = `${String(value(row, 'exercise_id'))}:${String(value(row, 'normalized_alias'))}`
    if (aliasKeys.has(key)) throw invalidBackup('alias opcional duplicado')
    aliasKeys.add(key)
  }
  const favoriteIds = new Set<number>()
  for (const row of favorites) {
    const id = Number(value(row, 'exercise_id'))
    if (favoriteIds.has(id) || !isIsoTimestamp(value(row, 'created_at'))) {
      throw invalidBackup('favorito opcional inválido')
    }
    favoriteIds.add(id)
  }
  const recentIds = new Set<number>()
  for (const row of recents) {
    const id = Number(value(row, 'exercise_id'))
    const count = value(row, 'use_count')
    if (
      recentIds.has(id)
      || !isIsoTimestamp(value(row, 'last_used_at'))
      || !Number.isInteger(count)
      || Number(count) < 1
    ) throw invalidBackup('uso recente opcional inválido')
    recentIds.add(id)
  }
}

function assertEnums(backup: Partial<TrainingBackup>) {
  enumRows(backup.exercises!, 'category', ['STRENGTH', 'HYPERTROPHY', 'ENDURANCE', 'CARDIO', 'MOBILITY', 'STRETCHING', 'TECHNIQUE', 'RECOVERY'])
  enumRows(backup.exercises!, 'source', ['SYSTEM', 'BUNDLED', 'CUSTOM', 'WGER', 'EXERCISEDB'])
  enumRows(backup.media!, 'type', ['IMAGE', 'VIDEO'])
  enumRows(backup.media!, 'source', ['SYSTEM', 'BUNDLED', 'CUSTOM', 'WGER', 'EXERCISEDB', 'LEGACY'])
  enumRows(backup.trainingPlanDays!, 'weekday', ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
  enumRows(backup.trainingDayExercises!, 'set_type', ['NORMAL', 'WARM_UP', 'DROP_SET', 'BI_SET', 'CIRCUIT', 'TO_FAILURE', 'CONTROLLED_TEMPO'])
  enumRows(backup.sessions!, 'status', ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'])
  enumRows(backup.sessionExercises!, 'status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'])
  enumRows(backup.sessionExercises!, 'set_type', ['NORMAL', 'WARM_UP', 'DROP_SET', 'BI_SET', 'CIRCUIT', 'TO_FAILURE', 'CONTROLLED_TEMPO'])
  enumRows(backup.nutritionMeals ?? [], 'meal_type', ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER'])
  enumRows(backup.nutritionMeals ?? [], 'source', ['MANUAL', 'CAMERA', 'GALLERY', 'BARCODE', 'SAVED_MEAL'])
  enumRows(backup.nutritionMealItems ?? [], 'data_source', ['MANUAL', 'LOCAL_DATABASE', 'USDA', 'OPEN_FOOD_FACTS', 'AI_ESTIMATE'])
}

function assertNutritionRows(backup: Partial<TrainingBackup>) {
  const meals = (backup.nutritionMeals ?? []) as Record<string, unknown>[]
  const items = (backup.nutritionMealItems ?? []) as Record<string, unknown>[]
  const summaries = (backup.nutritionDailySummaries ?? []) as Record<string, unknown>[]
  const dates = new Set<string>()
  for (const row of meals) if (!isDateKey(row.local_date) || !isIsoTimestamp(row.consumed_at) || !isIsoTimestamp(row.created_at) || !isIsoTimestamp(row.updated_at)) throw invalidBackup('data inválida em nutrição')
  for (const row of items) {
    if (typeof row.name !== 'string' || !row.name.trim() || typeof row.portion_description !== 'string' || !isIsoTimestamp(row.created_at) || !isIsoTimestamp(row.updated_at) || !Number.isInteger(row.sort_order) || Number(row.sort_order) < 0) throw invalidBackup('item nutricional inválido')
    if (row.confidence != null && (typeof row.confidence !== 'number' || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1)) throw invalidBackup('confidence inválida')
    if (typeof row.micronutrients_json !== 'string') throw invalidBackup('micronutrientes inválidos')
    validateMicronutrients(row.micronutrients_json)
  }
  assertUniqueOrder(items, 'meal_id', 'sort_order')
  const purgedDates = new Set(summaries.filter((row) => row.details_purged_at != null).map((row) => String(row.local_date)))
  if (meals.some((row) => purgedDates.has(String(row.local_date)))) throw invalidBackup('refeições presentes após expurgo')
  if (items.some((row) => purgedDates.has(String(meals.find((meal) => meal.id === row.meal_id)?.local_date)))) throw invalidBackup('detalhes presentes após expurgo')
  for (const row of summaries) {
    if (!isDateKey(row.local_date) || dates.has(String(row.local_date)) || !isIsoTimestamp(row.closed_at) || !isIsoTimestamp(row.updated_at)) throw invalidBackup('resumo nutricional inválido')
    dates.add(String(row.local_date))
    if (![row.finalized].every((value) => value === undefined || value === 0 || value === 1)) throw invalidBackup('estado do resumo inválido')
    if (row.details_purged_at != null && (!isIsoTimestamp(row.details_purged_at) || row.finalized !== 1)) throw invalidBackup('data de expurgo inválida')
    if (!Number.isInteger(row.meal_count) || Number(row.meal_count) < 0 || !Number.isInteger(row.item_count) || Number(row.item_count) < 0) throw invalidBackup('contagem nutricional inválida')
    const goal = (key: string) => { const value = row[key]; return value == null ? null : value as number }
    validateNutritionGoals({ caloriesKcal: goal('goal_calories_kcal'), proteinGrams: goal('goal_protein_grams'), carbohydratesGrams: goal('goal_carbohydrates_grams'), fatGrams: goal('goal_fat_grams'), fiberGrams: goal('goal_fiber_grams') })
    if (typeof row.total_micronutrients_json !== 'string') throw invalidBackup('micronutrientes do resumo inválidos')
    validateMicronutrients(row.total_micronutrients_json)
  }
  const setting = (backup.settings ?? []).find((row) => value(row, 'key') === 'nutrition.goals')
  if (setting) {
    try { const data = JSON.parse(String(value(setting, 'value_json'))); validateNutritionGoals({ caloriesKcal: data.caloriesKcal ?? null, proteinGrams: data.proteinGrams ?? null, carbohydratesGrams: data.carbohydratesGrams ?? null, fatGrams: data.fatGrams ?? null, fiberGrams: data.fiberGrams ?? null }) } catch { throw invalidBackup('metas nutricionais inválidas') }
  }
}

function validateMicronutrients(value: unknown) {
  if (typeof value !== 'string') throw invalidBackup('JSON de micronutrientes inválido')
  let parsed: unknown
  try { parsed = JSON.parse(value) } catch { throw invalidBackup('JSON de micronutrientes inválido') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalidBackup('JSON de micronutrientes inválido')
  for (const [code, amount] of Object.entries(parsed)) if (!MICRONUTRIENT_CODES.includes(code as typeof MICRONUTRIENT_CODES[number]) || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw invalidBackup('micronutriente inválido')
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
    backup.sessionExercises!, backup.setLogs!, backup.nutritionMeals ?? [], backup.nutritionMealItems ?? [], backup.nutritionDailySummaries ?? [],
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
    'manually_added', 'unilateral', 'timed', 'is_main', 'estimated_grams', 'calories_kcal', 'protein_grams', 'carbohydrates_grams', 'fat_grams', 'fiber_grams', 'total_calories_kcal', 'total_protein_grams', 'total_carbohydrates_grams', 'total_fat_grams', 'total_fiber_grams', 'confidence', 'meal_count', 'item_count', 'finalized', 'goal_calories_kcal', 'goal_protein_grams', 'goal_carbohydrates_grams', 'goal_fat_grams', 'goal_fiber_grams',
  ])
  const nonNegative = new Set([
    'sort_order', 'set_number', 'sets', 'min_reps', 'max_reps', 'planned_load',
    'planned_duration_seconds', 'planned_distance', 'rest_seconds',
    'estimated_duration_minutes', 'paused_duration_seconds', 'total_duration_seconds',
    'planned_sets', 'planned_min_reps', 'planned_max_reps', 'reps', 'load',
    'duration_seconds', 'distance', 'width', 'height', 'estimated_grams', 'calories_kcal', 'protein_grams', 'carbohydrates_grams', 'fat_grams', 'fiber_grams', 'total_calories_kcal', 'total_protein_grams', 'total_carbohydrates_grams', 'total_fat_grams', 'total_fiber_grams', 'meal_count', 'item_count',
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
    'paused_at', 'deleted_at', 'purge_at', 'consumed_at', 'closed_at', 'details_purged_at',
  ]
  const dateFields = ['start_date', 'end_date', 'scheduled_date']
  const rows = [
    ...backup.exercises!, ...backup.media!, ...backup.trainingPlans!, ...backup.sessions!, ...(backup.nutritionMeals ?? []), ...(backup.nutritionMealItems ?? []), ...(backup.nutritionDailySummaries ?? []),
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

function assertTrainingPlanLifecycle(rows: unknown[], schemaVersion: 1 | 2 | 3) {
  for (const row of rows) {
    const record = row as Record<string, unknown>
    if ((schemaVersion === 2 || schemaVersion === 3) && (!('deleted_at' in record) || !('purge_at' in record))) {
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

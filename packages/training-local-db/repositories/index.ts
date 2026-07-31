import {
  DomainError,
  WEEKDAYS,
  activeSessionExists,
  activeSessionUsesTrainingPlan,
  calculateDashboard,
  computeTrainingPlanPurgeAt,
  createSessionSnapshot,
  createTrainingPlan,
  invalidTransition,
  localDateKey,
  nextTrainingPlanCopyName,
  finishWorkoutSession,
  normalizeName,
  rankExerciseSearch,
  notFound,
  pauseWorkoutSession,
  reorder,
  resumeWorkoutSession,
  serializeJson,
  trainingPlanInTrash,
  validateDayExerciseInput,
  validateExercise,
  validateRestActivityInput,
  validateSetLogInput,
  validateTrainingPlanDayInput,
  validateTrainingPlanCreationDays,
  validateTrainingPlanInput,
  type BackupRepository,
  type DashboardRepository,
  type DayExerciseConfigInput,
  type ExerciseDefinitionInput,
  type ExternalExerciseCandidate,
  type ExternalExerciseImportRepository,
  type ExternalExerciseImportResult,
  type ExerciseLibraryQuery,
  type ExerciseLibraryRepository,
  type SetLogInput,
  type SettingsRepository,
  type TrainingPlan,
  type TrainingPlanCreationInput,
  type TrainingPlanDay,
  type TrainingPlanDuplicateMode,
  type TrainingPlanRepository,
  type TrainingPlanTrashRepository,
  type WorkoutSession,
  type WorkoutSessionRepository,
} from '@training/training-domain'
import type { BindValue, SqlDatabase } from '../database'
import {
  mapDayExercise,
  mapExercise,
  mapMedia,
  mapPlan,
  mapRestActivity,
  mapSession,
  mapSessionExercise,
  mapSet,
  type Row,
} from '../mappers'
import { createBackupRepository } from '../backup'
import {
  clearUserData,
  createAppMetadataRepository,
  type AppMetadataRepository,
} from '../database/installation'
import { syncBundledCatalog, type BundledCatalog, type CatalogSyncResult } from '../database/catalog'

export interface LocalRepositories {
  exercises: ExerciseLibraryRepository
  externalExerciseImport: ExternalExerciseImportRepository
  plans: TrainingPlanRepository & {
    reorderRestActivities(planId: number, dayId: number, activityIds: number[]): Promise<TrainingPlan>
  }
  planTrash: TrainingPlanTrashRepository
  sessions: WorkoutSessionRepository
  dashboard: DashboardRepository
  settings: SettingsRepository
  backup: BackupRepository
  metadata: AppMetadataRepository
  maintenance: {
    clearUserData(): Promise<void>
  }
  catalog: {
    sync(catalog: BundledCatalog): Promise<CatalogSyncResult>
  }
}

export function createLocalRepositories(database: SqlDatabase): LocalRepositories {
  const exercises = exerciseRepository(database)
  const plans = planRepository(database)
  const sessions = sessionRepository(database)
  const planTrash = trainingPlanTrashRepository(database)
  return {
    exercises,
    externalExerciseImport: externalExerciseImportRepository(database),
    plans,
    planTrash,
    sessions,
    dashboard: {
      get: async () => {
        const [history, allPlans] = await Promise.all([sessions.getHistory(), plans.list()])
        return calculateDashboard(history, allPlans.find((plan) => plan.active && !plan.archived) ?? null)
      },
    },
    settings: settingsRepository(database),
    backup: createBackupRepository(database),
    metadata: createAppMetadataRepository(database),
    maintenance: {
      clearUserData: () => clearUserData(database),
    },
    catalog: {
      sync: (catalog) => syncBundledCatalog(database, catalog),
    },
  }
}

function externalExerciseImportRepository(database: SqlDatabase): ExternalExerciseImportRepository {
  return {
    previewExisting: async (candidates) => {
      const externalIds = uniqueCandidates(candidates).map((item) => item.externalId)
      if (!externalIds.length) return []
      const rows = await database.all<{ id: number; external_id: string }>(
        `SELECT id, external_id FROM exercise_definitions
         WHERE source = 'WGER' AND external_id IN (${externalIds.map(() => '?').join(',')})`,
        ...externalIds,
      )
      const ids = new Map(rows.map((row) => [row.external_id, row.id]))
      return externalIds.map((externalId) => ({
        externalId,
        existingId: ids.get(externalId) ?? null,
        alreadyImported: ids.has(externalId),
      }))
    },
    importSelected: (candidates) => database.transaction(async (transaction) => {
      const result: ExternalExerciseImportResult = emptyImportResult()
      const selected = uniqueCandidates(candidates)
      result.skipped = candidates.length - selected.length
      for (const candidate of selected) {
        const existing = await transaction.first<{ id: number }>(
          `SELECT id FROM exercise_definitions WHERE source = 'WGER' AND external_id = ?`,
          candidate.externalId,
        )
        const before = existing ? await loadExercise(transaction, existing.id) : null
        const unchanged = before ? importedExerciseMatches(before, candidate) : false
        const exerciseId = await upsertImportedExercise(transaction, candidate, existing?.id)
        await upsertImportedMedia(transaction, exerciseId, candidate)
        if (!existing) result.created += 1
        else if (unchanged) result.unchanged += 1
        else result.updated += 1
        result.affectedIds.push(exerciseId)
        result.warnings.push(...candidate.warnings.map((warning) => `${candidate.name}: ${warning}`))
      }
      return result
    }),
    refreshImported: async (provider) => {
      const row = await database.first<{ count: number }>(
        'SELECT COUNT(*) AS count FROM exercise_definitions WHERE source = ?',
        provider,
      )
      return { ...emptyImportResult(), unchanged: row?.count ?? 0 }
    },
  }
}

async function upsertImportedExercise(
  database: SqlDatabase,
  candidate: ExternalExerciseCandidate,
  existingId?: number,
) {
  const timestamp = new Date().toISOString()
  if (existingId) {
    await database.run(`
      UPDATE exercise_definitions SET
        name = ?, normalized_name = ?, description = ?, primary_muscle_group = ?,
        secondary_muscle_groups_json = ?, equipment = ?, category = ?, difficulty = ?,
        instructions = ?, unilateral = ?, timed = ?, source_url = ?, license_name = ?,
        license_url = ?, author = ?, updated_at = ?
      WHERE id = ? AND source = 'WGER'
    `, candidate.name, normalizeName(candidate.name), candidate.description,
    candidate.primaryMuscleGroup, serializeJson(candidate.secondaryMuscleGroups),
    candidate.equipment, candidate.category, candidate.difficulty, candidate.instructions,
    Number(candidate.unilateral), Number(candidate.timed), candidate.sourceUrl,
    candidate.licenseName, candidate.licenseUrl, candidate.author, timestamp, existingId)
    return existingId
  }
  const inserted = await database.run(`
    INSERT INTO exercise_definitions(
      name, normalized_name, description, primary_muscle_group, secondary_muscle_groups_json,
      equipment, category, difficulty, instructions, notes, unilateral, timed, source,
      external_id, source_url, license_name, license_url, author, archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'WGER', ?, ?, ?, ?, ?, 0, ?, ?)
  `, candidate.name, normalizeName(candidate.name), candidate.description,
  candidate.primaryMuscleGroup, serializeJson(candidate.secondaryMuscleGroups),
  candidate.equipment, candidate.category, candidate.difficulty, candidate.instructions,
  Number(candidate.unilateral), Number(candidate.timed), candidate.externalId,
  candidate.sourceUrl, candidate.licenseName, candidate.licenseUrl, candidate.author,
  timestamp, timestamp)
  return inserted.lastInsertRowId
}

async function upsertImportedMedia(
  database: SqlDatabase,
  exerciseId: number,
  candidate: ExternalExerciseCandidate,
) {
  const timestamp = new Date().toISOString()
  const mediaCandidates = candidate.media.filter(isValidImportedMedia)
  const mediaIds = mediaCandidates.map((media) => media.externalId)
  if (mediaIds.length) {
    await database.run(
      `DELETE FROM exercise_media
       WHERE exercise_definition_id = ? AND source = 'WGER'
         AND external_id NOT IN (${mediaIds.map(() => '?').join(',')})`,
      exerciseId,
      ...mediaIds,
    )
  } else {
    await database.run(
      `DELETE FROM exercise_media WHERE exercise_definition_id = ? AND source = 'WGER'`,
      exerciseId,
    )
  }
  for (const media of mediaCandidates) {
    await database.run(`
      INSERT INTO exercise_media(
        exercise_definition_id, type, source, external_id, remote_url, thumbnail_remote_url,
        mime_type, width, height, duration_seconds, is_main, sort_order, license_name,
        license_url, author, source_url, created_at, updated_at
      ) VALUES (?, ?, 'WGER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
        exercise_definition_id = excluded.exercise_definition_id,
        type = excluded.type,
        remote_url = excluded.remote_url,
        thumbnail_remote_url = excluded.thumbnail_remote_url,
        mime_type = excluded.mime_type,
        width = excluded.width,
        height = excluded.height,
        duration_seconds = excluded.duration_seconds,
        is_main = excluded.is_main,
        sort_order = excluded.sort_order,
        license_name = excluded.license_name,
        license_url = excluded.license_url,
        author = excluded.author,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at
    `, exerciseId, media.type, media.externalId, media.remoteUrl, media.thumbnailRemoteUrl,
    media.mimeType, media.width, media.height, media.durationSeconds, Number(media.main),
    media.sortOrder, media.licenseName, media.licenseUrl, media.author, media.sourceUrl,
    timestamp, timestamp)
  }
}

function isValidImportedMedia(media: ExternalExerciseCandidate['media'][number]) {
  if (media.source !== 'WGER' || !media.externalId.trim()) return false
  if (!['IMAGE', 'VIDEO'].includes(media.type)) return false
  try {
    if (new URL(media.remoteUrl).protocol !== 'https:') return false
  } catch {
    return false
  }
  return [media.width, media.height, media.durationSeconds]
    .every((value) => value == null || (Number.isFinite(value) && value >= 0))
}

function uniqueCandidates(candidates: ExternalExerciseCandidate[]) {
  const unique = new Map<string, ExternalExerciseCandidate>()
  for (const candidate of candidates) {
    if (candidate.provider === 'WGER' && /^\d+$/.test(candidate.externalId) && candidate.name.trim()) {
      unique.set(candidate.externalId, candidate)
    }
  }
  return [...unique.values()]
}

function emptyImportResult(): ExternalExerciseImportResult {
  return {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    affectedIds: [],
  }
}

function importedExerciseMatches(
  current: Awaited<ReturnType<typeof loadExercise>>,
  candidate: ExternalExerciseCandidate,
) {
  if (!current) return false
  const currentMedia = current.media.filter((item) => item.source === 'WGER').map((item) => ({
    type: item.type, externalId: item.externalId, remoteUrl: item.remoteUrl,
    thumbnailRemoteUrl: item.thumbnailRemoteUrl, mimeType: item.mimeType,
    width: item.width, height: item.height, durationSeconds: item.durationSeconds,
    main: item.main, sortOrder: item.sortOrder, licenseName: item.licenseName,
    licenseUrl: item.licenseUrl, author: item.author, sourceUrl: item.sourceUrl,
  }))
  const candidateMedia = candidate.media.filter(isValidImportedMedia)
    .map(({ source: _source, ...item }) => item)
  return JSON.stringify({
    name: current.name,
    description: current.description,
    primaryMuscleGroup: current.primaryMuscleGroup,
    secondaryMuscleGroups: current.secondaryMuscleGroups,
    equipment: current.equipment,
    category: current.category,
    difficulty: current.difficulty,
    instructions: current.instructions,
    unilateral: current.unilateral,
    timed: current.timed,
    sourceUrl: current.sourceUrl,
    licenseName: current.licenseName,
    licenseUrl: current.licenseUrl,
    author: current.author,
    media: currentMedia,
  }) === JSON.stringify({
    name: candidate.name,
    description: candidate.description,
    primaryMuscleGroup: candidate.primaryMuscleGroup,
    secondaryMuscleGroups: candidate.secondaryMuscleGroups,
    equipment: candidate.equipment,
    category: candidate.category,
    difficulty: candidate.difficulty,
    instructions: candidate.instructions,
    unilateral: candidate.unilateral,
    timed: candidate.timed,
    sourceUrl: candidate.sourceUrl,
    licenseName: candidate.licenseName,
    licenseUrl: candidate.licenseUrl,
    author: candidate.author,
    media: candidateMedia,
  })
}

function exerciseRepository(database: SqlDatabase): ExerciseLibraryRepository {
  return {
    list: (query) => loadExercises(database, query),
    findById: (id) => loadExercise(database, id),
    search: (query) => loadExercises(database, { query }),
    create: (input) => saveExercise(database, input),
    update: async (id, input) => {
      const validated = validateExercise(input)
      const timestamp = new Date().toISOString()
      const result = await database.run(`
        UPDATE exercise_definitions SET
          name = ?, normalized_name = ?, description = ?, primary_muscle_group = ?,
          secondary_muscle_groups_json = ?, equipment = ?, category = ?, difficulty = ?,
          instructions = ?, notes = ?, unilateral = ?, timed = ?, updated_at = ?
        WHERE id = ?
      `, validated.name, normalizeName(validated.name), validated.description.trim(),
      validated.primaryMuscleGroup.trim(), serializeJson(validated.secondaryMuscleGroups),
      validated.equipment.trim(), validated.category, validated.difficulty.trim(),
      validated.instructions.trim(), validated.notes.trim(), Number(validated.unilateral),
      Number(validated.timed), timestamp, id)
      if (!result.changes) throw notFound('Exercício')
      return (await loadExercise(database, id))!
    },
    archive: async (id) => setExerciseArchived(database, id, true),
    restore: async (id) => setExerciseArchived(database, id, false),
    setFavorite: async (id, favorite) => {
      await requireExercise(database, id)
      if (favorite) {
        await database.run(`
          INSERT INTO exercise_favorites(exercise_id, created_at) VALUES (?, ?)
          ON CONFLICT(exercise_id) DO NOTHING
        `, id, new Date().toISOString())
      } else {
        await database.run('DELETE FROM exercise_favorites WHERE exercise_id = ?', id)
      }
    },
    recordRecentUsage: (id, usedAt) => recordRecentUsage(database, id, usedAt),
    updateNotes: async (id, notes) => {
      if (notes.length > 4_000) {
        throw new DomainError('INVALID_EXERCISE_NOTES', 'Use no máximo 4.000 caracteres nas notas.')
      }
      const result = await database.run(
        'UPDATE exercise_definitions SET notes = ?, updated_at = ? WHERE id = ?',
        notes.trim(),
        new Date().toISOString(),
        id,
      )
      if (!result.changes) throw notFound('Exercício')
      return (await loadExercise(database, id))!
    },
  }
}

async function saveExercise(database: SqlDatabase, input: ExerciseDefinitionInput) {
  const validated = validateExercise(input)
  const timestamp = new Date().toISOString()
  const result = await database.run(`
    INSERT INTO exercise_definitions(
      name, normalized_name, description, primary_muscle_group, secondary_muscle_groups_json,
      equipment, category, difficulty, instructions, notes, unilateral, timed, source,
      archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOM', 0, ?, ?)
  `, validated.name, normalizeName(validated.name), validated.description.trim(),
  validated.primaryMuscleGroup.trim(), serializeJson(validated.secondaryMuscleGroups),
  validated.equipment.trim(), validated.category, validated.difficulty.trim(),
  validated.instructions.trim(), validated.notes.trim(), Number(validated.unilateral),
  Number(validated.timed), timestamp, timestamp)
  return (await loadExercise(database, result.lastInsertRowId))!
}

async function setExerciseArchived(database: SqlDatabase, id: number, archived: boolean) {
  const result = await database.run(
    'UPDATE exercise_definitions SET archived = ?, updated_at = ? WHERE id = ?',
    Number(archived), new Date().toISOString(), id,
  )
  if (!result.changes) throw notFound('Exercício')
}

async function loadExercises(database: SqlDatabase, query: ExerciseLibraryQuery = {}) {
  const clauses: string[] = []
  const params: BindValue[] = []
  if (!query.includeArchived) clauses.push('definition.archived = 0')
  if (query.muscle?.trim()) {
    clauses.push('lower(definition.primary_muscle_group) LIKE ?')
    params.push(`%${query.muscle.trim().toLowerCase()}%`)
  }
  if (query.equipment?.trim()) {
    clauses.push('lower(definition.equipment) LIKE ?')
    params.push(`%${query.equipment.trim().toLowerCase()}%`)
  }
  if (query.category) {
    clauses.push('definition.category = ?')
    params.push(query.category)
  }
  if (query.source) {
    if (query.source === 'BUNDLED') clauses.push(`catalog.source = 'BUNDLED'`)
    else {
      clauses.push('definition.source = ? AND catalog.exercise_id IS NULL')
      params.push(query.source)
    }
  }
  if (query.hasVideo) {
    clauses.push(`EXISTS (
      SELECT 1 FROM exercise_media media
      WHERE media.exercise_definition_id = definition.id AND media.type = 'VIDEO'
    )`)
  }
  if (query.hasMedia) clauses.push(`EXISTS (
    SELECT 1 FROM exercise_media media
    WHERE media.exercise_definition_id = definition.id
      AND (
        (media.local_uri IS NOT NULL AND media.local_uri <> ''
          AND media.local_uri NOT LIKE 'placeholder://%')
        OR (media.remote_url IS NOT NULL AND media.remote_url <> ''
          AND media.remote_url NOT LIKE 'placeholder://%')
      )
  )`)
  if (query.favorite) clauses.push('favorite.exercise_id IS NOT NULL')
  if (query.recent) clauses.push('recent.exercise_id IS NOT NULL')
  const rows = await database.all<Row>(
    `SELECT definition.*,
       CASE WHEN catalog.exercise_id IS NOT NULL THEN 'BUNDLED' ELSE definition.source END AS resolved_source,
       catalog.external_id AS catalog_external_id,
       CASE WHEN favorite.exercise_id IS NOT NULL THEN 1 ELSE 0 END AS favorite,
       recent.last_used_at,
       COALESCE(recent.use_count, 0) AS use_count
     FROM exercise_definitions definition
     LEFT JOIN exercise_catalog_entries catalog ON catalog.exercise_id = definition.id
     LEFT JOIN exercise_favorites favorite ON favorite.exercise_id = definition.id
     LEFT JOIN exercise_recent_usage recent ON recent.exercise_id = definition.id
     ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
     ORDER BY ${query.recent ? 'recent.last_used_at DESC, ' : ''}definition.name`,
    ...params,
  )
  const [mediaRows, aliasRows] = rows.length
    ? await Promise.all([
      database.all<Row>(
      `SELECT * FROM exercise_media WHERE exercise_definition_id IN (${rows.map(() => '?').join(',')})
       ORDER BY exercise_definition_id, is_main DESC, sort_order`,
      ...rows.map((row) => Number(row.id)),
      ),
      database.all<{ exercise_id: number; alias: string }>(
        `SELECT exercise_id, alias FROM exercise_aliases
         WHERE exercise_id IN (${rows.map(() => '?').join(',')})
         ORDER BY exercise_id, normalized_alias`,
        ...rows.map((row) => Number(row.id)),
      ),
    ])
    : [[], []]
  const exercises = rows.map((row) => mapExercise(
    row,
    mediaRows.filter((media) => Number(media.exercise_definition_id) === Number(row.id)).map(mapMedia),
    aliasRows.filter((alias) => alias.exercise_id === Number(row.id)).map((alias) => alias.alias),
  ))
  return query.query?.trim() ? rankExerciseSearch(exercises, query.query) : exercises
}

async function loadExercise(database: SqlDatabase, id: number) {
  const row = await database.first<Row>(`
    SELECT definition.*,
      CASE WHEN catalog.exercise_id IS NOT NULL THEN 'BUNDLED' ELSE definition.source END AS resolved_source,
      catalog.external_id AS catalog_external_id,
      CASE WHEN favorite.exercise_id IS NOT NULL THEN 1 ELSE 0 END AS favorite,
      recent.last_used_at,
      COALESCE(recent.use_count, 0) AS use_count
    FROM exercise_definitions definition
    LEFT JOIN exercise_catalog_entries catalog ON catalog.exercise_id = definition.id
    LEFT JOIN exercise_favorites favorite ON favorite.exercise_id = definition.id
    LEFT JOIN exercise_recent_usage recent ON recent.exercise_id = definition.id
    WHERE definition.id = ?
  `, id)
  if (!row) return null
  const [media, aliases] = await Promise.all([
    database.all<Row>(
      'SELECT * FROM exercise_media WHERE exercise_definition_id = ? ORDER BY is_main DESC, sort_order',
      id,
    ),
    database.all<{ alias: string }>(
      'SELECT alias FROM exercise_aliases WHERE exercise_id = ? ORDER BY normalized_alias',
      id,
    ),
  ])
  return mapExercise(row, media.map(mapMedia), aliases.map((alias) => alias.alias))
}

async function requireExercise(database: SqlDatabase, id: number) {
  if (!await database.first('SELECT id FROM exercise_definitions WHERE id = ?', id)) {
    throw notFound('Exercício')
  }
}

async function recordRecentUsage(database: SqlDatabase, id: number, usedAt = new Date().toISOString()) {
  await requireExercise(database, id)
  const parsed = new Date(usedAt)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== usedAt) {
    throw new DomainError('INVALID_DATE', 'Data de uso recente inválida.')
  }
  await database.run(`
    INSERT INTO exercise_recent_usage(exercise_id, last_used_at, use_count)
    VALUES (?, ?, 1)
    ON CONFLICT(exercise_id) DO UPDATE SET
      last_used_at = excluded.last_used_at,
      use_count = exercise_recent_usage.use_count + 1
  `, id, usedAt)
}

function planRepository(database: SqlDatabase): LocalRepositories['plans'] {
  const get = (id: number) => requireNormalPlan(database, id)
  const createWithDays = (input: TrainingPlanCreationInput) =>
    database.transaction(async (transaction) => {
      const validPlan = validateTrainingPlanInput(input.plan)
      const validDays = validateTrainingPlanCreationDays(input.days)
        .map((day) => ({
          ...day,
          ...validateTrainingPlanDayInput({
            title: day.title,
            description: day.description,
            restDay: day.restDay,
            estimatedDurationMinutes: day.estimatedDurationMinutes,
            notes: day.notes,
          }),
        }))
        .sort((first, second) => WEEKDAYS.indexOf(first.weekday) - WEEKDAYS.indexOf(second.weekday))
      const timestamp = new Date().toISOString()
      const result = await transaction.run(`
        INSERT INTO training_plans(
          name, description, category, difficulty, start_date, end_date,
          active, archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `, validPlan.name, validPlan.description, validPlan.category, validPlan.difficulty,
      validPlan.startDate ?? null, validPlan.endDate ?? null, timestamp, timestamp)
      for (const [sortOrder, day] of validDays.entries()) {
        await transaction.run(`
          INSERT INTO training_plan_days(
            training_plan_id, weekday, title, description, sort_order, rest_day,
            estimated_duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, result.lastInsertRowId, day.weekday, day.title, day.description, sortOrder,
        Number(day.restDay), day.estimatedDurationMinutes, day.notes)
      }
      return (await loadPlan(transaction, result.lastInsertRowId))!
    })
  return {
    list: () => loadPlans(database),
    findById: (id) => loadPlan(database, id),
    getById: get,
    create: (input) => database.transaction(async (transaction) => {
      const now = new Date()
      const planDraft = createTrainingPlan(input, 0, () => 0, now)
      const result = await transaction.run(`
        INSERT INTO training_plans(
          name, description, category, difficulty, start_date, end_date,
          active, archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `, planDraft.name, planDraft.description, planDraft.category, planDraft.difficulty,
      planDraft.startDate, planDraft.endDate, planDraft.createdAt, planDraft.updatedAt)
      for (const day of planDraft.days) {
        await transaction.run(`
          INSERT INTO training_plan_days(
            training_plan_id, weekday, title, description, sort_order, rest_day,
            estimated_duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, result.lastInsertRowId, day.weekday, day.title, day.description, day.sortOrder,
        Number(day.restDay), day.estimatedDurationMinutes, day.notes)
      }
      return (await loadPlan(transaction, result.lastInsertRowId))!
    }),
    createWithDays,
    update: async (id, input) => {
      await assertNormalPlan(database, id)
      const valid = validateTrainingPlanInput(input)
      const result = await database.run(`
        UPDATE training_plans SET name = ?, description = ?, category = ?, difficulty = ?,
          start_date = ?, end_date = ?, updated_at = ? WHERE id = ?
      `, valid.name, valid.description, valid.category, valid.difficulty,
      valid.startDate ?? null, valid.endDate ?? null, new Date().toISOString(), id)
      if (!result.changes) throw notFound('Ficha')
      return get(id)
    },
    duplicate: (id, mode) => database.transaction(async (transaction) => {
      const source = await requireNormalPlan(transaction, id)
      const rows = await transaction.all<{ name: string }>(
        'SELECT name FROM training_plans WHERE deleted_at IS NULL',
      )
      const name = nextTrainingPlanCopyName(source.name, rows.map((row) => row.name))
      const timestamp = new Date().toISOString()
      const inserted = await transaction.run(`
        INSERT INTO training_plans(
          name, description, category, difficulty, start_date, end_date,
          active, archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `, name, source.description, source.category, source.difficulty,
      source.startDate, source.endDate, timestamp, timestamp)
      for (const sourceDay of source.days) {
        const day = await transaction.run(`
          INSERT INTO training_plan_days(
            training_plan_id, weekday, title, description, sort_order, rest_day,
            estimated_duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, inserted.lastInsertRowId, sourceDay.weekday, sourceDay.title, sourceDay.description,
        sourceDay.sortOrder, Number(sourceDay.restDay), sourceDay.estimatedDurationMinutes, sourceDay.notes)
        for (const exercise of sourceDay.exercises) {
          await insertDayExercise(
            transaction,
            day.lastInsertRowId,
            exercise.exercise.id,
            duplicateExerciseConfig(exercise, mode),
          )
        }
        for (const activity of sourceDay.restActivities) {
          await transaction.run(`
            INSERT INTO rest_activities(
              training_plan_day_id, name, description, estimated_duration_minutes,
              category, optional, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, day.lastInsertRowId, activity.name, activity.description,
          activity.estimatedDurationMinutes, activity.category, Number(activity.optional), activity.sortOrder)
        }
      }
      return (await loadPlan(transaction, inserted.lastInsertRowId))!
    }),
    activate: (id) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, id)
      if (!await transaction.first<Row>(
        'SELECT id FROM training_plans WHERE id = ? AND archived = 0 AND deleted_at IS NULL',
        id,
      )) {
        throw notFound('Ficha')
      }
      await transaction.run('UPDATE training_plans SET active = 0 WHERE active = 1')
      await transaction.run(
        'UPDATE training_plans SET active = 1, updated_at = ? WHERE id = ?',
        new Date().toISOString(), id,
      )
      return (await loadPlan(transaction, id))!
    }),
    archive: (id, archived = true) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, id)
      const result = await transaction.run(
        `UPDATE training_plans SET archived = ?, active = 0, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        Number(archived), new Date().toISOString(), id,
      )
      if (!result.changes) throw notFound('Ficha')
      return (await loadPlan(transaction, id))!
    }),
    updateDay: async (planId, dayId, input) => {
      await assertNormalPlan(database, planId)
      const valid = validateTrainingPlanDayInput(input)
      const result = await database.run(`
        UPDATE training_plan_days SET title = ?, description = ?, rest_day = ?,
          estimated_duration_minutes = ?, notes = ?
        WHERE id = ? AND training_plan_id = ?
      `, valid.title, valid.description, Number(valid.restDay),
      valid.estimatedDurationMinutes, valid.notes, dayId, planId)
      if (!result.changes) throw notFound('Dia')
      return get(planId)
    },
    addExercise: (planId, dayId, input) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      await assertDay(transaction, planId, dayId)
      if (!await transaction.first<Row>('SELECT id FROM exercise_definitions WHERE id = ? AND archived = 0', input.exerciseDefinitionId)) {
        throw notFound('Exercício')
      }
      const last = await transaction.first<{ value: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) AS value FROM training_day_exercises WHERE training_plan_day_id = ?',
        dayId,
      )
      await insertDayExercise(transaction, dayId, input.exerciseDefinitionId, {
        ...input,
        sortOrder: (last?.value ?? -1) + 1,
      })
      await recordRecentUsage(transaction, input.exerciseDefinitionId)
      return (await loadPlan(transaction, planId))!
    }),
    updateExercise: async (planId, dayId, exerciseId, input) => {
      await assertNormalPlan(database, planId)
      await assertDay(database, planId, dayId)
      const valid = validateDayExerciseInput(input)
      const result = await database.run(`
        UPDATE training_day_exercises SET sets = ?, min_reps = ?, max_reps = ?,
          planned_load = ?, planned_duration_seconds = ?, planned_distance = ?,
          rest_seconds = ?, planned_rpe = ?, set_type = ?, notes = ?,
          alternative_exercise_id = ?
        WHERE id = ? AND training_plan_day_id = ?
      `, valid.sets, valid.minReps, valid.maxReps, valid.plannedLoad,
      valid.plannedDurationSeconds, valid.plannedDistance, valid.restSeconds,
      valid.plannedRpe, valid.setType, valid.notes, valid.alternativeExerciseId,
      exerciseId, dayId)
      if (!result.changes) throw notFound('Exercício da ficha')
      return get(planId)
    },
    removeExercise: (planId, dayId, exerciseId) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      await assertDay(transaction, planId, dayId)
      const result = await transaction.run(
        'DELETE FROM training_day_exercises WHERE id = ? AND training_plan_day_id = ?',
        exerciseId, dayId,
      )
      if (!result.changes) throw notFound('Exercício da ficha')
      await compactOrder(transaction, 'training_day_exercises', dayId)
      return (await loadPlan(transaction, planId))!
    }),
    reorderExercise: (planId, dayId, exerciseIds) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      await assertDay(transaction, planId, dayId)
      const rows = await transaction.all<{ id: number; sort_order: number }>(
        'SELECT id, sort_order FROM training_day_exercises WHERE training_plan_day_id = ?',
        dayId,
      )
      reorder(rows.map((row) => ({ id: row.id, sortOrder: row.sort_order })), exerciseIds)
      await applyOrder(transaction, 'training_day_exercises', dayId, exerciseIds)
      return (await loadPlan(transaction, planId))!
    }),
    addRestActivity: (planId, dayId, input) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      const valid = validateRestActivityInput(input)
      await assertDay(transaction, planId, dayId)
      const last = await transaction.first<{ value: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) AS value FROM rest_activities WHERE training_plan_day_id = ?',
        dayId,
      )
      await transaction.run(`
        INSERT INTO rest_activities(
          training_plan_day_id, name, description, estimated_duration_minutes,
          category, optional, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, dayId, valid.name, valid.description, valid.estimatedDurationMinutes,
      valid.category, Number(valid.optional), (last?.value ?? -1) + 1)
      return (await loadPlan(transaction, planId))!
    }),
    updateRestActivity: async (planId, dayId, activityId, input) => {
      await assertNormalPlan(database, planId)
      await assertDay(database, planId, dayId)
      const valid = validateRestActivityInput(input)
      const result = await database.run(`
        UPDATE rest_activities SET name = ?, description = ?, estimated_duration_minutes = ?,
          category = ?, optional = ? WHERE id = ? AND training_plan_day_id = ?
      `, valid.name, valid.description, valid.estimatedDurationMinutes,
      valid.category, Number(valid.optional), activityId, dayId)
      if (!result.changes) throw notFound('Atividade')
      return get(planId)
    },
    removeRestActivity: (planId, dayId, activityId) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      await assertDay(transaction, planId, dayId)
      const result = await transaction.run(
        'DELETE FROM rest_activities WHERE id = ? AND training_plan_day_id = ?',
        activityId, dayId,
      )
      if (!result.changes) throw notFound('Atividade')
      await compactOrder(transaction, 'rest_activities', dayId)
      return (await loadPlan(transaction, planId))!
    }),
    reorderRestActivities: (planId, dayId, activityIds) => database.transaction(async (transaction) => {
      await assertNormalPlan(transaction, planId)
      await assertDay(transaction, planId, dayId)
      const rows = await transaction.all<{ id: number; sort_order: number }>(
        'SELECT id, sort_order FROM rest_activities WHERE training_plan_day_id = ?',
        dayId,
      )
      reorder(rows.map((row) => ({ id: row.id, sortOrder: row.sort_order })), activityIds)
      await applyOrder(transaction, 'rest_activities', dayId, activityIds)
      return (await loadPlan(transaction, planId))!
    }),
  }
}

function trainingPlanTrashRepository(database: SqlDatabase): TrainingPlanTrashRepository {
  return {
    list: async () => {
      const rows = await database.all<Row>(
        `SELECT * FROM training_plans
         WHERE deleted_at IS NOT NULL
         ORDER BY julianday(purge_at) ASC, julianday(deleted_at) ASC`,
      )
      return Promise.all(rows.map((row) => loadPlanFromRow(database, row)))
    },
    count: async () => {
      const row = await database.first<{ value: number }>(
        'SELECT COUNT(*) AS value FROM training_plans WHERE deleted_at IS NOT NULL',
      )
      return row?.value ?? 0
    },
    moveToTrash: (planId, requestedDeletedAt) => database.transaction(async (transaction) => {
      const row = await transaction.first<Row>('SELECT * FROM training_plans WHERE id = ?', planId)
      if (!row) throw notFound('Ficha')
      if (row.deleted_at !== null) {
        throw new DomainError('TRAINING_PLAN_ALREADY_IN_TRASH', 'Esta ficha já está na lixeira.')
      }
      await assertNoActiveSessionForPlan(transaction, planId)
      const deletedAt = requestedDeletedAt ?? new Date().toISOString()
      const purgeAt = computeTrainingPlanPurgeAt(deletedAt)
      await transaction.run(`
        UPDATE training_plans
        SET active = 0, archived = 0, deleted_at = ?, purge_at = ?, updated_at = ?
        WHERE id = ?
      `, deletedAt, purgeAt, deletedAt, planId)
      return (await loadTrashPlan(transaction, planId))!
    }),
    restore: (planId) => database.transaction(async (transaction) => {
      const result = await transaction.run(`
        UPDATE training_plans
        SET active = 0, archived = 0, deleted_at = NULL, purge_at = NULL, updated_at = ?
        WHERE id = ? AND deleted_at IS NOT NULL
      `, new Date().toISOString(), planId)
      if (!result.changes) await throwTrashPlanState(transaction, planId)
      return requireNormalPlan(transaction, planId)
    }),
    deletePermanently: (planId) => database.transaction(async (transaction) => {
      await requireTrashPlan(transaction, planId)
      await assertNoActiveSessionForPlan(transaction, planId)
      await transaction.run('DELETE FROM training_plans WHERE id = ? AND deleted_at IS NOT NULL', planId)
    }),
    emptyTrash: () => database.transaction(async (transaction) => {
      const blocked = await transaction.first<Row>(`
        SELECT plan.id FROM training_plans plan
        JOIN workout_sessions session ON session.training_plan_id = plan.id
        WHERE plan.deleted_at IS NOT NULL AND session.status IN ('IN_PROGRESS','PAUSED')
        LIMIT 1
      `)
      if (blocked) throw activeSessionUsesTrainingPlan()
      const result = await transaction.run('DELETE FROM training_plans WHERE deleted_at IS NOT NULL')
      return result.changes
    }),
    purgeExpired: (now = new Date().toISOString()) => database.transaction(async (transaction) => {
      const timestamp = new Date(now)
      if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== now) {
        throw new DomainError('INVALID_DATE', 'Data de limpeza inválida.')
      }
      const result = await transaction.run(`
        DELETE FROM training_plans
        WHERE deleted_at IS NOT NULL AND julianday(purge_at) <= julianday(?)
          AND NOT EXISTS (
            SELECT 1 FROM workout_sessions session
            WHERE session.training_plan_id = training_plans.id
              AND session.status IN ('IN_PROGRESS','PAUSED')
          )
      `, now)
      return result.changes
    }),
  }
}

async function assertNoActiveSessionForPlan(database: SqlDatabase, planId: number) {
  if (await database.first<Row>(`
    SELECT id FROM workout_sessions
    WHERE training_plan_id = ? AND status IN ('IN_PROGRESS','PAUSED') LIMIT 1
  `, planId)) throw activeSessionUsesTrainingPlan()
}

async function assertNormalPlan(database: SqlDatabase, id: number) {
  const row = await database.first<Row>(
    'SELECT id, deleted_at FROM training_plans WHERE id = ?',
    id,
  )
  if (!row) throw notFound('Ficha')
  if (row.deleted_at !== null) throw trainingPlanInTrash()
}

async function requireNormalPlan(database: SqlDatabase, id: number) {
  await assertNormalPlan(database, id)
  return (await loadPlan(database, id))!
}

async function requireTrashPlan(database: SqlDatabase, id: number) {
  const plan = await loadTrashPlan(database, id)
  if (plan) return plan
  await throwTrashPlanState(database, id)
  throw notFound('Ficha')
}

async function throwTrashPlanState(database: SqlDatabase, id: number): Promise<never> {
  if (await database.first<Row>('SELECT id FROM training_plans WHERE id = ?', id)) {
    throw new DomainError('TRAINING_PLAN_NOT_IN_TRASH', 'Esta ficha não está na lixeira.')
  }
  throw notFound('Ficha')
}

async function insertDayExercise(
  database: SqlDatabase,
  dayId: number,
  exerciseDefinitionId: number,
  input: DayExerciseConfigInput & { sortOrder: number },
) {
  const valid = validateDayExerciseInput(input)
  await database.run(`
    INSERT INTO training_day_exercises(
      training_plan_day_id, exercise_definition_id, sort_order, sets, min_reps,
      max_reps, planned_load, planned_duration_seconds, planned_distance,
      rest_seconds, planned_rpe, set_type, notes, alternative_exercise_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, dayId, exerciseDefinitionId, valid.sortOrder, valid.sets, valid.minReps, valid.maxReps,
  valid.plannedLoad, valid.plannedDurationSeconds, valid.plannedDistance, valid.restSeconds,
  valid.plannedRpe, valid.setType, valid.notes, valid.alternativeExerciseId)
}

function duplicateExerciseConfig(
  exercise: DayExerciseConfigInput & { sortOrder: number },
  mode: TrainingPlanDuplicateMode,
) {
  if (mode === 'STRUCTURE_ONLY') {
    return {
      ...exercise,
      plannedLoad: null,
      plannedRpe: null,
      notes: '',
      alternativeExerciseId: null,
    }
  }
  return mode === 'WITHOUT_LOADS' ? { ...exercise, plannedLoad: null } : exercise
}

async function assertDay(database: SqlDatabase, planId: number, dayId: number) {
  if (!await database.first<Row>(
    'SELECT id FROM training_plan_days WHERE id = ? AND training_plan_id = ?',
    dayId, planId,
  )) throw notFound('Dia')
}

async function applyOrder(database: SqlDatabase, table: 'training_day_exercises' | 'rest_activities', dayId: number, ids: number[]) {
  await database.run(`UPDATE ${table} SET sort_order = -sort_order - 1 WHERE training_plan_day_id = ?`, dayId)
  for (const [sortOrder, id] of ids.entries()) {
    await database.run(
      `UPDATE ${table} SET sort_order = ? WHERE id = ? AND training_plan_day_id = ?`,
      sortOrder, id, dayId,
    )
  }
}

async function compactOrder(database: SqlDatabase, table: 'training_day_exercises' | 'rest_activities', dayId: number) {
  const rows = await database.all<{ id: number }>(
    `SELECT id FROM ${table} WHERE training_plan_day_id = ? ORDER BY sort_order`,
    dayId,
  )
  await applyOrder(database, table, dayId, rows.map((row) => row.id))
}

async function loadPlans(database: SqlDatabase) {
  const rows = await database.all<Row>(
    `SELECT * FROM training_plans
     WHERE deleted_at IS NULL ORDER BY active DESC, updated_at DESC`,
  )
  return Promise.all(rows.map((row) => loadPlanFromRow(database, row)))
}

async function loadPlan(database: SqlDatabase, id: number) {
  const row = await database.first<Row>(
    'SELECT * FROM training_plans WHERE id = ? AND deleted_at IS NULL',
    id,
  )
  return row ? loadPlanFromRow(database, row) : null
}

async function loadTrashPlan(database: SqlDatabase, id: number) {
  const row = await database.first<Row>(
    'SELECT * FROM training_plans WHERE id = ? AND deleted_at IS NOT NULL',
    id,
  )
  return row ? loadPlanFromRow(database, row) : null
}

async function loadPlanFromRow(database: SqlDatabase, row: Row) {
  const dayRows = await database.all<Row>(
    'SELECT * FROM training_plan_days WHERE training_plan_id = ? ORDER BY sort_order',
    Number(row.id),
  )
  const days = await Promise.all(dayRows.map(async (dayRow): Promise<TrainingPlanDay> => {
    const [exerciseRows, activityRows] = await Promise.all([
      database.all<Row>(
        'SELECT * FROM training_day_exercises WHERE training_plan_day_id = ? ORDER BY sort_order',
        Number(dayRow.id),
      ),
      database.all<Row>(
        'SELECT * FROM rest_activities WHERE training_plan_day_id = ? ORDER BY sort_order',
        Number(dayRow.id),
      ),
    ])
    const exercises = await Promise.all(exerciseRows.map(async (exerciseRow) => {
      const exercise = await loadExercise(database, Number(exerciseRow.exercise_definition_id))
      if (!exercise) throw new DomainError('BROKEN_REFERENCE', 'A ficha referencia um exercício inexistente.')
      return mapDayExercise(exerciseRow, exercise)
    }))
    return {
      id: Number(dayRow.id),
      weekday: String(dayRow.weekday) as TrainingPlanDay['weekday'],
      title: String(dayRow.title),
      description: String(dayRow.description),
      sortOrder: Number(dayRow.sort_order),
      restDay: dayRow.rest_day === 1,
      estimatedDurationMinutes: Number(dayRow.estimated_duration_minutes),
      notes: String(dayRow.notes),
      exercises,
      restActivities: activityRows.map(mapRestActivity),
    }
  }))
  return mapPlan(row, days)
}

function sessionRepository(database: SqlDatabase): WorkoutSessionRepository {
  const requireSession = async (id: number) => {
    const session = await loadSession(database, id)
    if (!session) throw notFound('Sessão')
    return session
  }
  const mutateSet = async (
    sessionId: number,
    exerciseId: number,
    setId: number,
    input: SetLogInput,
  ) => {
    const valid = validateSetLogInput(input)
    await assertEditableSession(database, sessionId)
    const result = await database.run(`
      UPDATE workout_set_logs SET reps = ?, load = ?, duration_seconds = ?, distance = ?,
        rpe = ?, completed = ?, completed_at = ?, notes = ?
      WHERE id = ? AND workout_session_exercise_id = ?
        AND EXISTS (
          SELECT 1 FROM workout_session_exercises exercise
          JOIN workout_sessions session ON session.id = exercise.workout_session_id
          WHERE exercise.id = workout_set_logs.workout_session_exercise_id
            AND session.id = ? AND session.status = 'IN_PROGRESS' AND session.active_slot = 1
        )
    `, valid.reps, valid.load, valid.durationSeconds, valid.distance, valid.rpe,
    Number(valid.completed), valid.completed ? new Date().toISOString() : null,
    valid.notes, setId, exerciseId, sessionId)
    if (!result.changes) throw invalidTransition()
    return requireSession(sessionId)
  }
  return {
    getActive: async () => {
      const row = await database.first<Row>('SELECT id FROM workout_sessions WHERE active_slot = 1')
      return row ? loadSession(database, Number(row.id)) : null
    },
    getHistory: async () => {
      const rows = await database.all<Row>(
        `SELECT id FROM workout_sessions
         WHERE status IN ('COMPLETED','ABANDONED') ORDER BY started_at DESC`,
      )
      return Promise.all(rows.map((row) => loadSession(database, Number(row.id)) as Promise<WorkoutSession>))
    },
    findById: (id) => loadSession(database, id),
    start: async (planId, dayId) => {
      try {
        return await database.transaction(async (transaction) => {
          if (await transaction.first<Row>('SELECT id FROM workout_sessions WHERE active_slot = 1')) {
            throw activeSessionExists()
          }
          const plan = await requireNormalPlan(transaction, planId)
          const day = plan?.days.find((candidate) => candidate.id === dayId)
          if (!day) throw notFound('Ficha ou dia')
          if (day.restDay || !day.exercises.length) {
            throw new DomainError('EMPTY_TRAINING_DAY', 'Configure exercícios antes de iniciar esta sessão.')
          }
          const now = new Date()
          const timestamp = now.toISOString()
          const inserted = await transaction.run(`
            INSERT INTO workout_sessions(
              training_plan_id, plan_day_id, workout_name, day_name, scheduled_date,
              started_at, status, active_slot
            ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', 1)
          `, plan.id, day.id, plan.name, day.title, localDateKey(now), timestamp)
          const snapshot = createSessionSnapshot(
            plan, day, inserted.lastInsertRowId, () => 0, () => 0, now,
          )
          for (const exercise of snapshot.exercises) {
            const insertedExercise = await transaction.run(`
              INSERT INTO workout_session_exercises(
                workout_session_id, exercise_definition_id, name, muscle_group, category,
                timed, primary_video_url, primary_image_url, primary_video_source_url,
                primary_video_license_name, primary_video_license_url, primary_video_author,
                attribution, sort_order, planned_sets, planned_min_reps, planned_max_reps,
                planned_load, planned_duration_seconds, planned_distance, rest_seconds,
                set_type, status, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, snapshot.id, exercise.exerciseDefinitionId, exercise.name, exercise.muscleGroup,
            exercise.category, Number(exercise.timed), exercise.primaryVideoUrl, exercise.primaryImageUrl,
            exercise.primaryVideoSourceUrl, exercise.primaryVideoLicenseName,
            exercise.primaryVideoLicenseUrl, exercise.primaryVideoAuthor, exercise.attribution,
            exercise.sortOrder, exercise.plannedSets, exercise.plannedMinReps, exercise.plannedMaxReps,
            exercise.plannedLoad, exercise.plannedDurationSeconds, exercise.plannedDistance,
            exercise.restSeconds, exercise.setType, exercise.status, exercise.notes)
            for (const set of exercise.sets) {
              await transaction.run(`
                INSERT INTO workout_set_logs(
                  workout_session_exercise_id, set_number, reps, load, duration_seconds,
                  distance, rpe, completed, completed_at, manually_added, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, '')
              `, insertedExercise.lastInsertRowId, set.setNumber, set.reps, set.load,
              set.durationSeconds, set.distance, set.rpe)
            }
          }
          return (await loadSession(transaction, snapshot.id))!
        })
      } catch (cause) {
        if (cause instanceof DomainError) throw cause
        if (
          String(cause).includes('UNIQUE constraint failed: workout_sessions.active_slot')
          || String(cause).includes('database is locked')
        ) {
          throw activeSessionExists()
        }
        throw cause
      }
    },
    updateSet: mutateSet,
    applyProgression: (sessionId, exerciseId, suggestion) =>
      database.transaction(async (transaction) => {
        await assertEditableSession(transaction, sessionId)
        const owner = await transaction.first<Row>(`
          SELECT id FROM workout_session_exercises
          WHERE id = ? AND workout_session_id = ?
        `, exerciseId, sessionId)
        if (!owner) throw notFound('Exercício da sessão')
        await transaction.run(`
          UPDATE workout_set_logs
          SET reps = COALESCE(?, reps),
              load = COALESCE(?, load),
              duration_seconds = COALESCE(?, duration_seconds)
          WHERE workout_session_exercise_id = ? AND completed = 0
        `, suggestion.proposedReps, suggestion.proposedLoad,
        suggestion.proposedDurationSeconds, exerciseId)
        return (await loadSession(transaction, sessionId))!
      }),
    addSet: (sessionId, exerciseId) => database.transaction(async (transaction) => {
      await assertEditableSession(transaction, sessionId)
      const owner = await transaction.first<Row>(`
        SELECT exercise.id FROM workout_session_exercises exercise
        JOIN workout_sessions session ON session.id = exercise.workout_session_id
        WHERE exercise.id = ? AND session.id = ?
          AND session.status = 'IN_PROGRESS' AND session.active_slot = 1
      `, exerciseId, sessionId)
      if (!owner) throw notFound('Exercício da sessão')
      const last = await transaction.first<{ value: number }>(
        'SELECT COALESCE(MAX(set_number), 0) AS value FROM workout_set_logs WHERE workout_session_exercise_id = ?',
        exerciseId,
      )
      await transaction.run(`
        INSERT INTO workout_set_logs(
          workout_session_exercise_id, set_number, reps, load, duration_seconds,
          distance, completed, manually_added, notes
        ) VALUES (?, ?, 0, 0, 0, 0, 0, 1, '')
      `, exerciseId, (last?.value ?? 0) + 1)
      return (await loadSession(transaction, sessionId))!
    }),
    removeSet: (sessionId, exerciseId, setId) => database.transaction(async (transaction) => {
      await assertEditableSession(transaction, sessionId)
      const result = await transaction.run(`
        DELETE FROM workout_set_logs WHERE id = ? AND workout_session_exercise_id = ?
          AND EXISTS (
            SELECT 1 FROM workout_session_exercises exercise
            JOIN workout_sessions session ON session.id = exercise.workout_session_id
            WHERE exercise.id = workout_set_logs.workout_session_exercise_id
              AND session.id = ? AND session.status = 'IN_PROGRESS' AND session.active_slot = 1
          )
      `, setId, exerciseId, sessionId)
      if (!result.changes) throw notFound('Série')
      const rows = await transaction.all<{ id: number }>(
        'SELECT id FROM workout_set_logs WHERE workout_session_exercise_id = ? ORDER BY set_number',
        exerciseId,
      )
      for (const [index, row] of rows.entries()) {
        await transaction.run('UPDATE workout_set_logs SET set_number = ? WHERE id = ?', -(index + 1), row.id)
      }
      await transaction.run(
        'UPDATE workout_set_logs SET set_number = -set_number WHERE workout_session_exercise_id = ?',
        exerciseId,
      )
      return (await loadSession(transaction, sessionId))!
    }),
    updateExerciseStatus: async (sessionId, exerciseId, status) => {
      await assertEditableSession(database, sessionId)
      const result = await database.run(`
        UPDATE workout_session_exercises SET status = ? WHERE id = ?
          AND workout_session_id = ?
          AND EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE id = ? AND status = 'IN_PROGRESS' AND active_slot = 1
          )
      `, status, exerciseId, sessionId, sessionId)
      if (!result.changes) throw notFound('Exercício da sessão')
      return requireSession(sessionId)
    },
    updateExerciseNotes: async (sessionId, exerciseId, notes) => {
      const value = workoutNote(notes, 1_000)
      const result = await database.run(`
        UPDATE workout_session_exercises SET user_notes = ?
        WHERE id = ? AND workout_session_id = ?
          AND EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE id = ? AND status IN ('IN_PROGRESS','PAUSED') AND active_slot = 1
          )
      `, value, exerciseId, sessionId, sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    updateSessionNotes: async (sessionId, notes) => {
      const result = await database.run(`
        UPDATE workout_sessions SET notes = ?
        WHERE id = ? AND status IN ('IN_PROGRESS','PAUSED') AND active_slot = 1
      `, workoutNote(notes, 2_000), sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    substituteExercise: async (sessionId, exerciseId, replacementId, reason) => {
      const replacement = await database.first<Row>(`
        SELECT id, name FROM exercise_definitions
        WHERE id = ? AND archived = 0
      `, replacementId)
      if (!replacement) throw notFound('Exercício substituto')
      const duplicate = await database.first<Row>(`
        SELECT id FROM workout_session_exercises
        WHERE workout_session_id = ? AND id <> ?
          AND COALESCE(substitute_exercise_definition_id, exercise_definition_id) = ?
      `, sessionId, exerciseId, replacementId)
      if (duplicate) {
        throw new DomainError(
          'DUPLICATE_SESSION_EXERCISE',
          'Este exercício já está presente na sessão.',
        )
      }
      const result = await database.run(`
        UPDATE workout_session_exercises
        SET substitute_exercise_definition_id = ?, substitute_name = ?, substitution_reason = ?
        WHERE id = ? AND workout_session_id = ?
          AND exercise_definition_id <> ?
          AND EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE id = ? AND status IN ('IN_PROGRESS','PAUSED') AND active_slot = 1
          )
      `, replacementId, String(replacement.name), workoutNote(reason, 240), exerciseId, sessionId,
      replacementId, sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    undoSubstitution: async (sessionId, exerciseId) => {
      const result = await database.run(`
        UPDATE workout_session_exercises
        SET substitute_exercise_definition_id = NULL, substitute_name = NULL, substitution_reason = NULL
        WHERE id = ? AND workout_session_id = ?
          AND substitute_exercise_definition_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE id = ? AND status IN ('IN_PROGRESS','PAUSED') AND active_slot = 1
          )
      `, exerciseId, sessionId, sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    pause: async (sessionId) => {
      const current = await requireSession(sessionId)
      const paused = pauseWorkoutSession(current)
      const result = await database.run(`
        UPDATE workout_sessions SET status = 'PAUSED', paused_at = ?
        WHERE id = ? AND status = 'IN_PROGRESS' AND active_slot = 1
      `, paused.pausedAt, sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    resume: async (sessionId) => {
      const resumed = resumeWorkoutSession(await requireSession(sessionId))
      const result = await database.run(`
        UPDATE workout_sessions SET status = 'IN_PROGRESS', paused_at = NULL,
          paused_duration_seconds = ?
        WHERE id = ? AND status = 'PAUSED' AND active_slot = 1
      `, resumed.pausedDurationSeconds, sessionId)
      if (!result.changes) throw invalidTransition()
      return requireSession(sessionId)
    },
    complete: (sessionId, overallRpe, notes) =>
      finishSession(database, sessionId, 'COMPLETED', overallRpe, notes),
    abandon: (sessionId) => finishSession(database, sessionId, 'ABANDONED', null, null),
  }
}

function workoutNote(value: string, limit: number) {
  const note = value.trim()
  if (note.length > limit) {
    throw new DomainError('INVALID_WORKOUT_NOTE', `A anotação deve ter no máximo ${limit} caracteres.`)
  }
  return note
}

async function assertEditableSession(database: SqlDatabase, sessionId: number) {
  const row = await database.first<Row>(
    `SELECT id FROM workout_sessions
     WHERE id = ? AND status = 'IN_PROGRESS' AND active_slot = 1`,
    sessionId,
  )
  if (!row) throw invalidTransition()
}

async function finishSession(
  database: SqlDatabase,
  sessionId: number,
  status: 'COMPLETED' | 'ABANDONED',
  overallRpe: number | null,
  notes: string | null,
) {
  return database.transaction(async (transaction) => {
    const session = await loadSession(transaction, sessionId)
    if (!session || !['IN_PROGRESS', 'PAUSED'].includes(session.status)) throw invalidTransition()
    const finished = finishWorkoutSession(session, status, overallRpe, notes ?? session.notes)
    const result = await transaction.run(`
      UPDATE workout_sessions SET status = ?, active_slot = NULL, completed_at = ?,
        paused_at = NULL, paused_duration_seconds = ?, total_duration_seconds = ?,
        overall_rpe = ?, notes = ? WHERE id = ? AND active_slot = 1
    `, status, finished.completedAt, finished.pausedDurationSeconds,
    finished.totalDurationSeconds, finished.overallRpe, finished.notes, sessionId)
    if (!result.changes) throw invalidTransition()
    return (await loadSession(transaction, sessionId))!
  })
}

async function loadSession(database: SqlDatabase, id: number) {
  const row = await database.first<Row>('SELECT * FROM workout_sessions WHERE id = ?', id)
  if (!row) return null
  const exerciseRows = await database.all<Row>(
    'SELECT * FROM workout_session_exercises WHERE workout_session_id = ? ORDER BY sort_order',
    id,
  )
  const exercises = await Promise.all(exerciseRows.map(async (exerciseRow) => {
    const sets = await database.all<Row>(
      'SELECT * FROM workout_set_logs WHERE workout_session_exercise_id = ? ORDER BY set_number',
      Number(exerciseRow.id),
    )
    return mapSessionExercise(exerciseRow, sets.map(mapSet))
  }))
  return mapSession(row, exercises)
}

function settingsRepository(database: SqlDatabase): SettingsRepository {
  return {
    get: async <T>(key: string) => {
      const row = await database.first<{ value_json: string }>(
        'SELECT value_json FROM app_settings WHERE key = ?',
        key,
      )
      if (!row) return null
      return JSON.parse(row.value_json) as T
    },
    set: async (key, value) => {
      const updatedAt = new Date().toISOString()
      await database.run(`
        INSERT INTO app_settings(key, value_json, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
      `, key, serializeJson(value), updatedAt)
      return { key, value, updatedAt }
    },
    remove: async (key) => {
      await database.run('DELETE FROM app_settings WHERE key = ?', key)
    },
  }
}

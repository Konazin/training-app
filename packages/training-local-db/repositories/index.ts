import {
  DomainError,
  activeSessionExists,
  calculateDashboard,
  createSessionSnapshot,
  createTrainingPlan,
  duplicateTrainingPlan,
  invalidTransition,
  finishWorkoutSession,
  normalizeName,
  notFound,
  pauseWorkoutSession,
  reorder,
  resumeWorkoutSession,
  serializeJson,
  validateExercise,
  type BackupRepository,
  type DashboardRepository,
  type DayExerciseConfigInput,
  type ExerciseDefinitionInput,
  type ExerciseLibraryQuery,
  type ExerciseLibraryRepository,
  type SetLogInput,
  type SettingsRepository,
  type TrainingPlan,
  type TrainingPlanDay,
  type TrainingPlanRepository,
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

export interface LocalRepositories {
  exercises: ExerciseLibraryRepository
  plans: TrainingPlanRepository & {
    reorderRestActivities(planId: number, dayId: number, activityIds: number[]): Promise<TrainingPlan>
  }
  sessions: WorkoutSessionRepository
  dashboard: DashboardRepository
  settings: SettingsRepository
  backup: BackupRepository
}

export function createLocalRepositories(database: SqlDatabase): LocalRepositories {
  const exercises = exerciseRepository(database)
  const plans = planRepository(database)
  const sessions = sessionRepository(database)
  return {
    exercises,
    plans,
    sessions,
    dashboard: {
      get: async () => {
        const [history, allPlans] = await Promise.all([sessions.getHistory(), plans.list()])
        return calculateDashboard(history, allPlans.find((plan) => plan.active && !plan.archived) ?? null)
      },
    },
    settings: settingsRepository(database),
    backup: createBackupRepository(database),
  }
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
  if (!query.includeArchived) clauses.push('archived = 0')
  if (query.query?.trim()) {
    clauses.push('(normalized_name LIKE ? OR lower(description) LIKE ?)')
    const value = `%${normalizeName(query.query)}%`
    params.push(value, value)
  }
  if (query.muscle?.trim()) {
    clauses.push('lower(primary_muscle_group) LIKE ?')
    params.push(`%${query.muscle.trim().toLowerCase()}%`)
  }
  if (query.equipment?.trim()) {
    clauses.push('lower(equipment) LIKE ?')
    params.push(`%${query.equipment.trim().toLowerCase()}%`)
  }
  if (query.category) {
    clauses.push('category = ?')
    params.push(query.category)
  }
  if (query.source) {
    clauses.push('source = ?')
    params.push(query.source)
  }
  if (query.hasVideo) {
    clauses.push(`EXISTS (
      SELECT 1 FROM exercise_media media
      WHERE media.exercise_definition_id = exercise_definitions.id AND media.type = 'VIDEO'
    )`)
  }
  const rows = await database.all<Row>(
    `SELECT * FROM exercise_definitions ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY name`,
    ...params,
  )
  const mediaRows = rows.length
    ? await database.all<Row>(
      `SELECT * FROM exercise_media WHERE exercise_definition_id IN (${rows.map(() => '?').join(',')})
       ORDER BY exercise_definition_id, is_main DESC, sort_order`,
      ...rows.map((row) => Number(row.id)),
    )
    : []
  return rows.map((row) => mapExercise(
    row,
    mediaRows.filter((media) => Number(media.exercise_definition_id) === Number(row.id)).map(mapMedia),
  ))
}

async function loadExercise(database: SqlDatabase, id: number) {
  const row = await database.first<Row>('SELECT * FROM exercise_definitions WHERE id = ?', id)
  if (!row) return null
  const media = await database.all<Row>(
    'SELECT * FROM exercise_media WHERE exercise_definition_id = ? ORDER BY is_main DESC, sort_order',
    id,
  )
  return mapExercise(row, media.map(mapMedia))
}

function planRepository(database: SqlDatabase): LocalRepositories['plans'] {
  const get = async (id: number) => {
    const plan = await loadPlan(database, id)
    if (!plan) throw notFound('Ficha')
    return plan
  }
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
    update: async (id, input) => {
      const result = await database.run(`
        UPDATE training_plans SET name = ?, description = ?, category = ?, difficulty = ?,
          start_date = ?, end_date = ?, updated_at = ? WHERE id = ?
      `, input.name.trim(), input.description.trim(), input.category.trim(), input.difficulty.trim(),
      input.startDate ?? null, input.endDate ?? null, new Date().toISOString(), id)
      if (!result.changes) throw notFound('Ficha')
      return get(id)
    },
    duplicate: (id) => database.transaction(async (transaction) => {
      const source = await loadPlan(transaction, id)
      if (!source) throw notFound('Ficha')
      const draft = duplicateTrainingPlan(source, 0, () => 0, () => 0, () => 0)
      const inserted = await transaction.run(`
        INSERT INTO training_plans(
          name, description, category, difficulty, start_date, end_date,
          active, archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `, draft.name, draft.description, draft.category, draft.difficulty,
      draft.startDate, draft.endDate, draft.createdAt, draft.updatedAt)
      for (const sourceDay of source.days) {
        const day = await transaction.run(`
          INSERT INTO training_plan_days(
            training_plan_id, weekday, title, description, sort_order, rest_day,
            estimated_duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, inserted.lastInsertRowId, sourceDay.weekday, sourceDay.title, sourceDay.description,
        sourceDay.sortOrder, Number(sourceDay.restDay), sourceDay.estimatedDurationMinutes, sourceDay.notes)
        for (const exercise of sourceDay.exercises) {
          await insertDayExercise(transaction, day.lastInsertRowId, exercise.exercise.id, exercise)
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
      if (!await transaction.first<Row>('SELECT id FROM training_plans WHERE id = ? AND archived = 0', id)) {
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
      const result = await transaction.run(
        'UPDATE training_plans SET archived = ?, active = 0, updated_at = ? WHERE id = ?',
        Number(archived), new Date().toISOString(), id,
      )
      if (!result.changes) throw notFound('Ficha')
      return (await loadPlan(transaction, id))!
    }),
    updateDay: async (planId, dayId, input) => {
      const result = await database.run(`
        UPDATE training_plan_days SET title = ?, description = ?, rest_day = ?,
          estimated_duration_minutes = ?, notes = ?
        WHERE id = ? AND training_plan_id = ?
      `, input.title.trim(), input.description.trim(), Number(input.restDay),
      input.estimatedDurationMinutes, input.notes.trim(), dayId, planId)
      if (!result.changes) throw notFound('Dia')
      return get(planId)
    },
    addExercise: (planId, dayId, input) => database.transaction(async (transaction) => {
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
      return (await loadPlan(transaction, planId))!
    }),
    updateExercise: async (planId, dayId, exerciseId, input) => {
      const result = await database.run(`
        UPDATE training_day_exercises SET sets = ?, min_reps = ?, max_reps = ?,
          planned_load = ?, planned_duration_seconds = ?, planned_distance = ?,
          rest_seconds = ?, planned_rpe = ?, set_type = ?, notes = ?,
          alternative_exercise_id = ?
        WHERE id = ? AND training_plan_day_id = ?
      `, input.sets, input.minReps, input.maxReps, input.plannedLoad,
      input.plannedDurationSeconds, input.plannedDistance, input.restSeconds,
      input.plannedRpe, input.setType, input.notes, input.alternativeExerciseId,
      exerciseId, dayId)
      if (!result.changes) throw notFound('Exercício da ficha')
      return get(planId)
    },
    removeExercise: (planId, dayId, exerciseId) => database.transaction(async (transaction) => {
      const result = await transaction.run(
        'DELETE FROM training_day_exercises WHERE id = ? AND training_plan_day_id = ?',
        exerciseId, dayId,
      )
      if (!result.changes) throw notFound('Exercício da ficha')
      await compactOrder(transaction, 'training_day_exercises', dayId)
      return (await loadPlan(transaction, planId))!
    }),
    reorderExercise: (planId, dayId, exerciseIds) => database.transaction(async (transaction) => {
      const rows = await transaction.all<{ id: number; sort_order: number }>(
        'SELECT id, sort_order FROM training_day_exercises WHERE training_plan_day_id = ?',
        dayId,
      )
      reorder(rows.map((row) => ({ id: row.id, sortOrder: row.sort_order })), exerciseIds)
      await applyOrder(transaction, 'training_day_exercises', dayId, exerciseIds)
      return (await loadPlan(transaction, planId))!
    }),
    addRestActivity: (planId, dayId, input) => database.transaction(async (transaction) => {
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
      `, dayId, input.name.trim(), input.description.trim(), input.estimatedDurationMinutes,
      input.category.trim(), Number(input.optional), (last?.value ?? -1) + 1)
      return (await loadPlan(transaction, planId))!
    }),
    updateRestActivity: async (planId, dayId, activityId, input) => {
      const result = await database.run(`
        UPDATE rest_activities SET name = ?, description = ?, estimated_duration_minutes = ?,
          category = ?, optional = ? WHERE id = ? AND training_plan_day_id = ?
      `, input.name.trim(), input.description.trim(), input.estimatedDurationMinutes,
      input.category.trim(), Number(input.optional), activityId, dayId)
      if (!result.changes) throw notFound('Atividade')
      return get(planId)
    },
    removeRestActivity: (planId, dayId, activityId) => database.transaction(async (transaction) => {
      const result = await transaction.run(
        'DELETE FROM rest_activities WHERE id = ? AND training_plan_day_id = ?',
        activityId, dayId,
      )
      if (!result.changes) throw notFound('Atividade')
      await compactOrder(transaction, 'rest_activities', dayId)
      return (await loadPlan(transaction, planId))!
    }),
    reorderRestActivities: (planId, dayId, activityIds) => database.transaction(async (transaction) => {
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

async function insertDayExercise(
  database: SqlDatabase,
  dayId: number,
  exerciseDefinitionId: number,
  input: DayExerciseConfigInput & { sortOrder: number },
) {
  if (input.sets < 1 || input.minReps < 0 || input.maxReps < input.minReps || input.restSeconds < 0) {
    throw new DomainError('INVALID_EXERCISE_CONFIG', 'Configuração de exercício inválida.')
  }
  await database.run(`
    INSERT INTO training_day_exercises(
      training_plan_day_id, exercise_definition_id, sort_order, sets, min_reps,
      max_reps, planned_load, planned_duration_seconds, planned_distance,
      rest_seconds, planned_rpe, set_type, notes, alternative_exercise_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, dayId, exerciseDefinitionId, input.sortOrder, input.sets, input.minReps, input.maxReps,
  input.plannedLoad, input.plannedDurationSeconds, input.plannedDistance, input.restSeconds,
  input.plannedRpe, input.setType, input.notes, input.alternativeExerciseId)
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
  const rows = await database.all<Row>('SELECT * FROM training_plans ORDER BY active DESC, updated_at DESC')
  return Promise.all(rows.map((row) => loadPlanFromRow(database, row)))
}

async function loadPlan(database: SqlDatabase, id: number) {
  const row = await database.first<Row>('SELECT * FROM training_plans WHERE id = ?', id)
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
    if (input.reps < 0 || input.load < 0 || input.durationSeconds < 0 || input.distance < 0) {
      throw new DomainError('INVALID_SET', 'Valores da série não podem ser negativos.')
    }
    const result = await database.run(`
      UPDATE workout_set_logs SET reps = ?, load = ?, duration_seconds = ?, distance = ?,
        rpe = ?, completed = ?, completed_at = ?, notes = ?
      WHERE id = ? AND workout_session_exercise_id = ?
        AND EXISTS (
          SELECT 1 FROM workout_session_exercises exercise
          JOIN workout_sessions session ON session.id = exercise.workout_session_id
          WHERE exercise.id = workout_set_logs.workout_session_exercise_id
            AND session.id = ? AND session.active_slot = 1
        )
    `, input.reps, input.load, input.durationSeconds, input.distance, input.rpe,
    Number(input.completed), input.completed ? new Date().toISOString() : null,
    input.notes.trim(), setId, exerciseId, sessionId)
    if (!result.changes) throw notFound('Série')
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
          const plan = await loadPlan(transaction, planId)
          const day = plan?.days.find((candidate) => candidate.id === dayId)
          if (!plan || !day) throw notFound('Ficha ou dia')
          if (day.restDay || !day.exercises.length) {
            throw new DomainError('EMPTY_TRAINING_DAY', 'Configure exercícios antes de iniciar esta sessão.')
          }
          const timestamp = new Date().toISOString()
          const inserted = await transaction.run(`
            INSERT INTO workout_sessions(
              training_plan_id, plan_day_id, workout_name, day_name, scheduled_date,
              started_at, status, active_slot
            ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', 1)
          `, plan.id, day.id, plan.name, day.title, timestamp.slice(0, 10), timestamp)
          const snapshot = createSessionSnapshot(plan, day, inserted.lastInsertRowId, () => 0, () => 0)
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
    addSet: (sessionId, exerciseId) => database.transaction(async (transaction) => {
      const owner = await transaction.first<Row>(`
        SELECT exercise.id FROM workout_session_exercises exercise
        JOIN workout_sessions session ON session.id = exercise.workout_session_id
        WHERE exercise.id = ? AND session.id = ? AND session.active_slot = 1
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
      const result = await transaction.run(`
        DELETE FROM workout_set_logs WHERE id = ? AND workout_session_exercise_id = ?
          AND EXISTS (
            SELECT 1 FROM workout_session_exercises exercise
            JOIN workout_sessions session ON session.id = exercise.workout_session_id
            WHERE exercise.id = workout_set_logs.workout_session_exercise_id
              AND session.id = ? AND session.active_slot = 1
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
      const result = await database.run(`
        UPDATE workout_session_exercises SET status = ? WHERE id = ?
          AND workout_session_id = ?
          AND EXISTS (SELECT 1 FROM workout_sessions WHERE id = ? AND active_slot = 1)
      `, status, exerciseId, sessionId, sessionId)
      if (!result.changes) throw notFound('Exercício da sessão')
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
      await database.run(`
        UPDATE workout_sessions SET status = 'IN_PROGRESS', paused_at = NULL,
          paused_duration_seconds = ? WHERE id = ?
      `, resumed.pausedDurationSeconds, sessionId)
      return requireSession(sessionId)
    },
    complete: (sessionId, overallRpe, notes) =>
      finishSession(database, sessionId, 'COMPLETED', overallRpe, notes),
    abandon: (sessionId) => finishSession(database, sessionId, 'ABANDONED', null, ''),
  }
}

async function finishSession(
  database: SqlDatabase,
  sessionId: number,
  status: 'COMPLETED' | 'ABANDONED',
  overallRpe: number | null,
  notes: string,
) {
  return database.transaction(async (transaction) => {
    const session = await loadSession(transaction, sessionId)
    if (!session || !['IN_PROGRESS', 'PAUSED'].includes(session.status)) throw invalidTransition()
    const finished = finishWorkoutSession(session, status, overallRpe, notes)
    await transaction.run(`
      UPDATE workout_sessions SET status = ?, active_slot = NULL, completed_at = ?,
        paused_at = NULL, paused_duration_seconds = ?, total_duration_seconds = ?,
        overall_rpe = ?, notes = ? WHERE id = ? AND active_slot = 1
    `, status, finished.completedAt, finished.pausedDurationSeconds,
    finished.totalDurationSeconds, finished.overallRpe, finished.notes, sessionId)
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

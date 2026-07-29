import {
  WEEKDAYS,
  normalizeName,
  serializeJson,
  type ExerciseCategory,
  type ExerciseDefinitionInput,
  type Weekday,
} from '@training/training-domain'
import type { SqlDatabase } from '.'

export interface ExerciseSeed extends ExerciseDefinitionInput {
  key: string
}

export interface SeedData {
  version: 1
  exercises: ExerciseSeed[]
  demoPlan: {
    name: string
    description: string
    category: string
    difficulty: string
    days: Partial<Record<Weekday, {
      title: string
      restDay?: boolean
      exercises?: Array<{
        exerciseKey: string
        sets: number
        minReps: number
        maxReps: number
        restSeconds: number
      }>
    }>>
  }
}

export async function seedEmptyDatabase(database: SqlDatabase, seed: SeedData) {
  if (seed.version !== 1) throw new Error(`Seed ${seed.version} não suportado.`)
  const [exerciseCount, planCount] = await Promise.all([
    database.first<{ value: number }>('SELECT COUNT(*) AS value FROM exercise_definitions'),
    database.first<{ value: number }>('SELECT COUNT(*) AS value FROM training_plans'),
  ])
  if ((exerciseCount?.value ?? 0) > 0 || (planCount?.value ?? 0) > 0) return false

  await database.transaction(async (transaction) => {
    const timestamp = new Date().toISOString()
    const ids = new Map<string, number>()
    for (const exercise of seed.exercises) {
      const inserted = await transaction.run(`
        INSERT INTO exercise_definitions(
          name, normalized_name, description, primary_muscle_group,
          secondary_muscle_groups_json, equipment, category, difficulty,
          instructions, notes, unilateral, timed, source, archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYSTEM', 0, ?, ?)
      `, exercise.name.trim(), normalizeName(exercise.name), exercise.description.trim(),
      exercise.primaryMuscleGroup.trim(), serializeJson(exercise.secondaryMuscleGroups),
      exercise.equipment.trim(), exercise.category as ExerciseCategory, exercise.difficulty.trim(),
      exercise.instructions.trim(), exercise.notes.trim(), Number(exercise.unilateral),
      Number(exercise.timed), timestamp, timestamp)
      ids.set(exercise.key, inserted.lastInsertRowId)
    }
    const plan = await transaction.run(`
      INSERT INTO training_plans(
        name, description, category, difficulty, active, archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `, seed.demoPlan.name, seed.demoPlan.description, seed.demoPlan.category,
    seed.demoPlan.difficulty, timestamp, timestamp)
    for (const [sortOrder, weekday] of WEEKDAYS.entries()) {
      const configured = seed.demoPlan.days[weekday]
      const day = await transaction.run(`
        INSERT INTO training_plan_days(
          training_plan_id, weekday, title, description, sort_order, rest_day,
          estimated_duration_minutes, notes
        ) VALUES (?, ?, ?, '', ?, ?, 0, '')
      `, plan.lastInsertRowId, weekday, configured?.title ?? weekday,
      sortOrder, Number(configured?.restDay ?? !configured?.exercises?.length))
      for (const [exerciseOrder, exercise] of (configured?.exercises ?? []).entries()) {
        const exerciseId = ids.get(exercise.exerciseKey)
        if (!exerciseId) throw new Error(`Exercício ${exercise.exerciseKey} ausente no seed.`)
        await transaction.run(`
          INSERT INTO training_day_exercises(
            training_plan_day_id, exercise_definition_id, sort_order, sets,
            min_reps, max_reps, rest_seconds, set_type, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NORMAL', '')
        `, day.lastInsertRowId, exerciseId, exerciseOrder, exercise.sets,
        exercise.minReps, exercise.maxReps, exercise.restSeconds)
      }
    }
    await transaction.run(`
      INSERT INTO app_settings(key, value_json, updated_at)
      VALUES ('seed.version', ?, ?)
    `, serializeJson(seed.version), timestamp)
  })
  return true
}

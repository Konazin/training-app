import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { TrainingBackup } from '@training/training-domain'
import { MIGRATIONS, runMigrations } from '../migrations'
import { validateBackup } from '../backup'
import type { SqlDatabase } from '../database'
import {
  APP_METADATA_KEYS,
  clearUserData,
  initializeFirstInstallation,
  resetToSeed,
} from '../database/installation'
import type { SeedData } from '../database/seed'
import { createLocalRepositories } from '../repositories'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('SQLite local schema', () => {
  it('cria banco vazio, reaplica provider com segurança e garante constraints', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    await runMigrations(database)
    const tables = query(path, `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`)
      .map((row) => row.name)
    expect(tables).toEqual(expect.arrayContaining([
      'exercise_definitions', 'exercise_media', 'training_plans', 'training_plan_days',
      'training_day_exercises', 'rest_activities', 'workout_sessions',
      'workout_session_exercises', 'workout_set_logs', 'app_settings', 'app_metadata',
      'schema_migrations',
    ]))
    expect(query(path, 'SELECT COUNT(*) AS value FROM schema_migrations;')[0]?.value).toBe(3)

    const base = `
      PRAGMA foreign_keys=ON;
      INSERT INTO exercise_definitions(
        id,name,normalized_name,primary_muscle_group,equipment,category,difficulty,source,created_at,updated_at
      ) VALUES (1,'Flexão','flexao','Peitoral','Corpo','STRENGTH','Inicial','SYSTEM','x','x');
      INSERT INTO training_plans(
        id,name,category,difficulty,active,archived,created_at,updated_at
      ) VALUES (1,'Plano','Força','Inicial',1,0,'x','x');
      INSERT INTO training_plan_days(
        id,training_plan_id,weekday,title,sort_order,rest_day
      ) VALUES (1,1,'MONDAY','Segunda',0,0);
    `
    execute(path, base)
    const foreign = run(path, `
      PRAGMA foreign_keys=ON;
      INSERT INTO training_day_exercises(
        training_plan_day_id,exercise_definition_id,sort_order,sets,min_reps,max_reps,rest_seconds,set_type
      ) VALUES (999,1,0,3,8,12,60,'NORMAL');
    `)
    expect(foreign.status).not.toBe(0)

    execute(path, `
      INSERT INTO workout_sessions(
        id,training_plan_id,plan_day_id,workout_name,day_name,scheduled_date,started_at,status,active_slot
      ) VALUES (1,1,1,'Plano','Segunda','2026-07-29','x','IN_PROGRESS',1);
    `)
    const duplicateActive = run(path, `
      INSERT INTO workout_sessions(
        id,training_plan_id,plan_day_id,workout_name,day_name,scheduled_date,started_at,status,active_slot
      ) VALUES (2,1,1,'Plano','Segunda','2026-07-29','x','PAUSED',1);
    `)
    expect(duplicateActive.status).not.toBe(0)

    execute(path, `BEGIN; INSERT INTO app_settings VALUES ('temp','null','x'); ROLLBACK;`)
    expect(query(path, `SELECT COUNT(*) AS value FROM app_settings;`)[0]?.value).toBe(0)

    execute(path, `INSERT INTO app_settings VALUES ('preserved','{"ok":true}','x');`)
    const restoreFailure = spawnSync('sqlite3', ['-bail', path, `
      PRAGMA foreign_keys=ON;
      BEGIN;
      DELETE FROM app_settings;
      INSERT INTO training_day_exercises(
        training_plan_day_id,exercise_definition_id,sort_order,sets,min_reps,max_reps,rest_seconds,set_type
      ) VALUES (999,1,0,3,8,12,60,'NORMAL');
      COMMIT;
    `], { encoding: 'utf8', timeout: 5_000 })
    expect(restoreFailure.status).not.toBe(0)
    expect(query(path, `SELECT key FROM app_settings WHERE key='preserved';`)[0]?.key).toBe('preserved')
  })

  it('valida formato, referências e sessão única antes de restaurar', () => {
    const backup = validBackup()
    expect(() => validateBackup(backup)).not.toThrow()
    expect(() => validateBackup({ ...backup, schemaVersion: 2 })).toThrow('versão')
    expect(() => validateBackup({
      ...backup,
      media: [{ id: 2, exercise_definition_id: 999 }],
    })).toThrow('referência')
    expect(() => validateBackup({
      ...backup,
      sessions: [
        backup.sessions[0],
        { ...backup.sessions[0] as object, id: 2, active_slot: 1 },
      ],
    })).toThrow('sessão ativa')
    expect(() => validateBackup({
      ...backup,
      exercises: [backup.exercises[0], backup.exercises[0]],
    })).toThrow('duplicado')
    expect(() => validateBackup({
      ...backup,
      setLogs: [{ ...backup.setLogs[0] as object, reps: Number.NaN }],
    })).toThrow('número')
    expect(() => validateBackup({
      ...backup,
      setLogs: [{ ...backup.setLogs[0] as object, reps: '10' }],
    })).toThrow('número')
    expect(() => validateBackup(Object.assign(Object.create({ inherited: true }), backup)))
      .toThrow('prototype')
  })

  it('separa primeira instalação, apagar dados e recriar seed', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    expect(await initializeFirstInstallation(database, seedData())).toBe(true)
    expect(query(path, 'SELECT COUNT(*) AS value FROM exercise_definitions')[0]?.value).toBe(1)
    await clearUserData(database)
    expect(query(path, 'SELECT COUNT(*) AS value FROM exercise_definitions')[0]?.value).toBe(0)
    expect(query(path, `SELECT value_json FROM app_metadata WHERE key='${APP_METADATA_KEYS.seedSuppressed}'`)[0]?.value_json)
      .toBe('true')
    expect(await initializeFirstInstallation(database, seedData())).toBe(false)
    expect(query(path, 'SELECT COUNT(*) AS value FROM exercise_definitions')[0]?.value).toBe(0)
    await resetToSeed(database, seedData())
    expect(query(path, 'SELECT COUNT(*) AS value FROM exercise_definitions')[0]?.value).toBe(1)
    expect(query(path, `SELECT value_json FROM app_metadata WHERE key='${APP_METADATA_KEYS.seedSuppressed}'`)[0]?.value_json)
      .toBe('false')
    await database.close()
  })

  it('faz rollback real de create, start, duplicate, restore e reset', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    let repositories = createLocalRepositories(database)
    const initialPlan = (await repositories.plans.list())[0]!
    const initialPlanCount = (await repositories.plans.list()).length

    await database.close()
    let fail = failOn('INSERT INTO training_plan_days', 4)
    database = betterDatabase(path, fail)
    repositories = createLocalRepositories(database)
    await expect(repositories.plans.create({
      name: 'Falha', description: '', category: 'Força', difficulty: 'Inicial',
    })).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(initialPlanCount)
    await database.close()

    fail = failOn('INSERT INTO workout_set_logs')
    database = betterDatabase(path, fail)
    repositories = createLocalRepositories(database)
    await expect(repositories.sessions.start(initialPlan.id, initialPlan.days[0]!.id)).rejects.toThrow('injetada')
    expect(await repositories.sessions.getActive()).toBeNull()
    await database.close()

    database = betterDatabase(path)
    repositories = createLocalRepositories(database)
    await repositories.plans.addRestActivity(initialPlan.id, initialPlan.days[0]!.id, {
      name: 'Caminhada', description: '', estimatedDurationMinutes: 10,
      category: 'Recuperação', optional: true,
    })
    const backup = await repositories.backup.export('0.2.0')
    await database.close()

    fail = failOn('INSERT INTO rest_activities')
    database = betterDatabase(path, fail)
    repositories = createLocalRepositories(database)
    await expect(repositories.plans.duplicate(initialPlan.id)).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(initialPlanCount)
    await database.close()

    fail = failOn('INSERT INTO training_plans')
    database = betterDatabase(path, fail)
    repositories = createLocalRepositories(database)
    await expect(repositories.backup.restore(backup)).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(initialPlanCount)
    expect(await repositories.exercises.list()).toHaveLength(1)
    await database.close()

    fail = failOn('DELETE FROM training_plans')
    database = betterDatabase(path, fail)
    repositories = createLocalRepositories(database)
    await expect(repositories.backup.reset()).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(initialPlanCount)
    expect(await repositories.exercises.list()).toHaveLength(1)
    await database.close()
  })

  it('preserva ficha, sessão, snapshots e backup após reconstruir o provider', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
      );
      ${MIGRATIONS.map((migration) => migration.sql).join('\n')}
    `)
    expect(await initializeFirstInstallation(database, seedData())).toBe(true)
    expect(await initializeFirstInstallation(database, seedData())).toBe(false)

    let repositories = createLocalRepositories(database)
    const plan = (await repositories.plans.list())[0]!
    expect(plan.days).toHaveLength(7)
    const day = plan.days[0]!
    const custom = await repositories.exercises.create({
      name: 'Remada invertida',
      description: '',
      primaryMuscleGroup: 'Costas',
      secondaryMuscleGroups: ['Bíceps'],
      equipment: 'Barra',
      category: 'STRENGTH',
      difficulty: 'Iniciante',
      instructions: '',
      notes: '',
      unilateral: false,
      timed: false,
    })
    await expect(repositories.plans.update(plan.id, {
      name: '', description: '', category: plan.category, difficulty: plan.difficulty,
      startDate: '2026-08-01', endDate: '2026-07-01',
    })).rejects.toMatchObject({ code: 'INVALID_TRAINING_PLAN' })
    await expect(repositories.plans.updateDay(plan.id, day.id, {
      title: '', description: '', restDay: false, estimatedDurationMinutes: -1, notes: '',
    })).rejects.toMatchObject({ code: 'INVALID_TRAINING_DAY' })
    await expect(repositories.plans.addRestActivity(plan.id, day.id, {
      name: '', description: '', estimatedDurationMinutes: -1, category: '', optional: false,
    })).rejects.toMatchObject({ code: 'INVALID_REST_ACTIVITY' })
    await repositories.plans.addExercise(plan.id, day.id, {
      exerciseDefinitionId: custom.id,
      sets: 2,
      minReps: 6,
      maxReps: 10,
      plannedLoad: 5,
      plannedDurationSeconds: null,
      plannedDistance: null,
      restSeconds: 60,
      plannedRpe: null,
      setType: 'NORMAL',
      notes: '',
      alternativeExerciseId: null,
    })
    const configured = (await repositories.plans.getById(plan.id)).days[0]!.exercises
      .find((item) => item.exercise.id === custom.id)!
    await expect(repositories.plans.updateExercise(plan.id, day.id, configured.id, {
      sets: 0, minReps: 0, maxReps: 0, plannedLoad: null,
      plannedDurationSeconds: null, plannedDistance: null, restSeconds: 0,
      plannedRpe: null, setType: 'NORMAL', notes: '', alternativeExerciseId: null,
    })).rejects.toMatchObject({ code: 'INVALID_EXERCISE_CONFIG' })
    const started = await repositories.sessions.start(plan.id, day.id)
    await expect(repositories.sessions.start(plan.id, day.id)).rejects.toMatchObject({
      code: 'ACTIVE_SESSION_EXISTS',
    })
    const snapshotExercise = started.exercises.find((item) => item.exerciseDefinitionId === custom.id)!
    const snapshotSet = snapshotExercise.sets[0]!
    await repositories.sessions.updateSet(started.id, snapshotExercise.id, snapshotSet.id, {
      reps: 8,
      load: 5,
      durationSeconds: 0,
      distance: 0,
      rpe: 7,
      completed: true,
      notes: 'Persistido',
    })
    await repositories.sessions.pause(started.id)

    // Simula processo morto: fecha a conexão e recria repositories sobre uma conexão real nova.
    await database.close()
    database = betterDatabase(path)
    repositories = createLocalRepositories(database)
    const recovered = await repositories.sessions.getActive()
    expect(recovered?.status).toBe('PAUSED')
    expect(recovered?.exercises.find((item) => item.id === snapshotExercise.id)?.sets[0])
      .toMatchObject({ reps: 8, load: 5, completed: true, notes: 'Persistido' })
    await expect(repositories.sessions.updateSet(started.id, snapshotExercise.id, snapshotSet.id, {
      reps: 9, load: 5, durationSeconds: 0, distance: 0, rpe: 7, completed: true, notes: '',
    })).rejects.toMatchObject({ code: 'INVALID_SESSION_TRANSITION' })
    await repositories.sessions.resume(started.id)
    await expect(repositories.sessions.resume(started.id))
      .rejects.toMatchObject({ code: 'INVALID_SESSION_TRANSITION' })
    await repositories.exercises.update(custom.id, {
      name: 'Nome alterado depois',
      description: '',
      primaryMuscleGroup: 'Costas',
      secondaryMuscleGroups: [],
      equipment: 'Barra',
      category: 'STRENGTH',
      difficulty: 'Iniciante',
      instructions: '',
      notes: '',
      unilateral: false,
      timed: false,
    })
    await repositories.sessions.complete(started.id, 8, 'Concluída')
    await expect(repositories.sessions.complete(started.id, 8, 'Duplicada'))
      .rejects.toMatchObject({ code: 'INVALID_SESSION_TRANSITION' })
    await database.close()
    database = betterDatabase(path)
    repositories = createLocalRepositories(database)
    const history = await repositories.sessions.getHistory()
    expect(history[0]?.exercises.find((item) => item.exerciseDefinitionId === custom.id)?.name)
      .toBe('Remada invertida')
    expect(history[0]?.totalVolume).toBe(40)

    const backup = await repositories.backup.export('test')
    await expect(repositories.backup.restore({
      ...backup,
      media: [{ id: 999, exercise_definition_id: 999 }],
    })).rejects.toThrow('referência')
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    await repositories.backup.reset()
    expect(await repositories.plans.list()).toHaveLength(0)
    expect(await repositories.metadata.get(APP_METADATA_KEYS.initialized, (value): value is boolean =>
      typeof value === 'boolean')).toBe(true)
    await repositories.backup.restore(backup)
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    expect(await repositories.plans.list()).toHaveLength(1)
    await database.close()
  })
})

function newDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'training-local-db-'))
  directories.push(directory)
  return join(directory, 'training.db')
}

function run(database: string, sql: string) {
  return spawnSync('sqlite3', [database, sql], { encoding: 'utf8', timeout: 5_000 })
}

function execute(database: string, sql: string) {
  const result = run(database, sql)
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout)
}

function query(database: string, sql: string) {
  const result = spawnSync('sqlite3', ['-json', database, sql], { encoding: 'utf8', timeout: 5_000 })
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout)
  return JSON.parse(result.stdout || '[]') as Array<Record<string, string | number>>
}

function validBackup(): TrainingBackup {
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  return {
    schemaVersion: 1,
    appVersion: '0.2.0',
    exportedAt: '2026-07-29T00:00:00.000Z',
    exercises: [{
      id: 1, category: 'STRENGTH', source: 'SYSTEM',
      created_at: '2026-07-29T00:00:00.000Z', updated_at: '2026-07-29T00:00:00.000Z',
    }],
    media: [{
      id: 2, exercise_definition_id: 1, type: 'IMAGE', source: 'SYSTEM', sort_order: 0,
      created_at: '2026-07-29T00:00:00.000Z', updated_at: '2026-07-29T00:00:00.000Z',
    }],
    trainingPlans: [{
      id: 3, active: 1, created_at: '2026-07-29T00:00:00.000Z',
      updated_at: '2026-07-29T00:00:00.000Z',
    }],
    trainingPlanDays: weekdays.map((weekday, sort_order) => ({
      id: 4 + sort_order, training_plan_id: 3, weekday, sort_order,
    })),
    trainingDayExercises: [{
      id: 20, training_plan_day_id: 4, exercise_definition_id: 1,
      set_type: 'NORMAL', sort_order: 0,
    }],
    restActivities: [{ id: 21, training_plan_day_id: 4, sort_order: 0 }],
    sessions: [{
      id: 7, status: 'IN_PROGRESS', active_slot: 1, scheduled_date: '2026-07-29',
      started_at: '2026-07-29T00:00:00.000Z',
    }],
    sessionExercises: [{
      id: 8, workout_session_id: 7, status: 'PENDING', set_type: 'NORMAL', sort_order: 0,
    }],
    setLogs: [{ id: 9, workout_session_exercise_id: 8, set_number: 1, reps: 0 }],
    settings: [],
  }
}

function failOn(fragment: string, occurrence = 1) {
  let count = 0
  return (sql: string) => {
    if (!sql.includes(fragment)) return false
    count += 1
    return count === occurrence
  }
}

function betterDatabase(
  path: string,
  fail?: (sql: string) => boolean,
): SqlDatabase {
  const native = new Database(path)
  native.pragma('foreign_keys = ON')
  const adapter = (): SqlDatabase => {
    const assertAllowed = (sql: string) => {
      if (fail?.(sql)) throw new Error(`Falha injetada: ${sql.trim().slice(0, 40)}`)
    }
    const database: SqlDatabase = {
      exec: async (sql) => {
        assertAllowed(sql)
        native.exec(sql)
      },
      run: async (sql, ...params) => {
        assertAllowed(sql)
        const result = native.prepare(sql).run(...params)
        return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes }
      },
      first: async <T>(sql: string, ...params: Array<string | number | null | Uint8Array>) => {
        assertAllowed(sql)
        return (native.prepare(sql).get(...params) as T | undefined) ?? null
      },
      all: async <T>(sql: string, ...params: Array<string | number | null | Uint8Array>) => {
        assertAllowed(sql)
        return native.prepare(sql).all(...params) as T[]
      },
      transaction: async <T>(operation: (transaction: SqlDatabase) => Promise<T>) => {
        native.exec('BEGIN IMMEDIATE')
        try {
          const result = await operation(adapter())
          native.exec('COMMIT')
          return result
        } catch (cause) {
          native.exec('ROLLBACK')
          throw cause
        }
      },
      close: async () => {
        if (native.open) native.close()
      },
    }
    return database
  }
  return adapter()
}

function seedData(): SeedData {
  return {
    version: 1,
    exercises: [{
      key: 'push_up',
      name: 'Flexão',
      description: '',
      primaryMuscleGroup: 'Peitoral',
      secondaryMuscleGroups: [],
      equipment: 'Peso corporal',
      category: 'STRENGTH',
      difficulty: 'Iniciante',
      instructions: '',
      notes: '',
      unilateral: false,
      timed: false,
    }],
    demoPlan: {
      name: 'Ficha local',
      description: '',
      category: 'Calistenia',
      difficulty: 'Iniciante',
      days: {
        MONDAY: {
          title: 'Segunda',
          exercises: [{
            exerciseKey: 'push_up',
            sets: 1,
            minReps: 5,
            maxReps: 10,
            restSeconds: 30,
          }],
        },
      },
    },
  }
}

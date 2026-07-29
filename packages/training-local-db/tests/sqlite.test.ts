import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import type { TrainingBackup } from '@training/training-domain'
import { MIGRATIONS, runMigrations } from '../migrations'
import { validateBackup } from '../backup'
import type { SqlDatabase } from '../database'
import { seedEmptyDatabase, type SeedData } from '../database/seed'
import { createLocalRepositories } from '../repositories'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('SQLite local schema', () => {
  it('cria banco vazio, reaplica provider com segurança e garante constraints', async () => {
    const path = newDatabase()
    const database = cliDatabase(path)
    await runMigrations(database)
    await runMigrations(database)
    const tables = query(path, `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`)
      .map((row) => row.name)
    expect(tables).toEqual(expect.arrayContaining([
      'exercise_definitions', 'exercise_media', 'training_plans', 'training_plan_days',
      'training_day_exercises', 'rest_activities', 'workout_sessions',
      'workout_session_exercises', 'workout_set_logs', 'app_settings', 'schema_migrations',
    ]))
    expect(query(path, 'SELECT COUNT(*) AS value FROM schema_migrations;')[0]?.value).toBe(2)

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
  })

  it('preserva ficha, sessão, snapshots e backup após reconstruir o provider', async () => {
    const path = newDatabase()
    const database = cliDatabase(path)
    await database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
      );
      ${MIGRATIONS.map((migration) => migration.sql).join('\n')}
    `)
    expect(await seedEmptyDatabase(database, seedData())).toBe(true)
    expect(await seedEmptyDatabase(database, seedData())).toBe(false)

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

    // Simula processo morto: descarta instâncias e reconstrói repositories sobre o mesmo arquivo.
    repositories = createLocalRepositories(cliDatabase(path))
    const recovered = await repositories.sessions.getActive()
    expect(recovered?.status).toBe('PAUSED')
    expect(recovered?.exercises.find((item) => item.id === snapshotExercise.id)?.sets[0])
      .toMatchObject({ reps: 8, load: 5, completed: true, notes: 'Persistido' })
    await repositories.sessions.resume(started.id)
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
    await repositories.backup.restore(backup)
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    expect(await repositories.plans.list()).toHaveLength(1)
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
  return {
    schemaVersion: 1,
    appVersion: '0.1.1',
    exportedAt: '2026-07-29T00:00:00.000Z',
    exercises: [{ id: 1 }],
    media: [{ id: 2, exercise_definition_id: 1 }],
    trainingPlans: [{ id: 3 }],
    trainingPlanDays: [{ id: 4, training_plan_id: 3 }],
    trainingDayExercises: [{ id: 5, training_plan_day_id: 4, exercise_definition_id: 1 }],
    restActivities: [{ id: 6, training_plan_day_id: 4 }],
    sessions: [{ id: 7, status: 'IN_PROGRESS', active_slot: 1 }],
    sessionExercises: [{ id: 8, workout_session_id: 7 }],
    setLogs: [{ id: 9, workout_session_exercise_id: 8 }],
    settings: [],
  }
}

function cliDatabase(path: string): SqlDatabase {
  const invoke = <T>(sql: string, params: Array<string | number | null | Uint8Array> = []) => {
    let index = 0
    const bound = sql.replace(/\?/g, () => literal(params[index++]))
    if (index !== params.length) throw new Error('Quantidade de parâmetros inválida no teste.')
    const result = spawnSync('sqlite3', ['-json', path, `PRAGMA foreign_keys=ON; ${bound}`], {
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout)
    return JSON.parse(result.stdout || '[]') as T
  }
  const database: SqlDatabase = {
    exec: async (sql) => { invoke(sql) },
    run: async (sql, ...params) => {
      const rows = invoke<Array<{ lastInsertRowId: number; changes: number }>>(
        `${bind(sql, params)}; SELECT last_insert_rowid() AS lastInsertRowId, changes() AS changes`,
      )
      return rows.at(-1) ?? { lastInsertRowId: 0, changes: 0 }
    },
    first: async <T>(sql: string, ...params: Array<string | number | null | Uint8Array>) =>
      invoke<T[]>(sql, params)[0] ?? null,
    all: async <T>(sql: string, ...params: Array<string | number | null | Uint8Array>) =>
      invoke<T[]>(sql, params),
    // O teste usa arquivo real e constraints; atomicidade é coberta separadamente pelo rollback nativo.
    transaction: (operation) => operation(database),
    close: async () => {},
  }
  return database
}

function bind(sql: string, params: Array<string | number | null | Uint8Array>) {
  let index = 0
  const result = sql.replace(/\?/g, () => literal(params[index++]))
  if (index !== params.length) throw new Error('Quantidade de parâmetros inválida no teste.')
  return result
}

function literal(value: string | number | null | Uint8Array | undefined) {
  if (value == null) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`
  return `'${value.replaceAll("'", "''")}'`
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

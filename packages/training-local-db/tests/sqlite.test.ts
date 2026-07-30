import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BUNDLED_EXERCISES,
  TRAINING_PLAN_TEMPLATES,
  type ExternalExerciseCandidate,
  type TrainingBackup,
} from '@training/training-domain'
import { syncBundledCatalog } from '../database/catalog'
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
    expect(query(path, 'SELECT COUNT(*) AS value FROM schema_migrations;')[0]?.value).toBe(6)

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
    const v2 = {
      ...backup,
      schemaVersion: 2 as const,
      trainingPlans: backup.trainingPlans.map((row) => ({
        ...row as object,
        deleted_at: null,
        purge_at: null,
      })),
    }
    expect(() => validateBackup(v2)).not.toThrow()
    expect(() => validateBackup({ ...backup, schemaVersion: 3 })).toThrow('versão')
    expect(() => validateBackup({ ...v2, trainingPlans: backup.trainingPlans })).toThrow('ciclo de vida')
    expect(() => validateBackup({
      ...v2,
      trainingPlans: [{
        ...v2.trainingPlans[0] as object,
        active: 0,
        deleted_at: '2026-07-29T00:00:00.000Z',
        purge_at: null,
      }],
    })).toThrow('ciclo de vida')
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
    await expect(repositories.plans.duplicate(initialPlan.id, 'COMPLETE')).rejects.toThrow('injetada')
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
    expect(backup.schemaVersion).toBe(2)
    await expect(repositories.backup.restore({
      ...backup,
      media: [{ id: 999, exercise_definition_id: 999 }],
    })).rejects.toThrow('referência')
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    await repositories.backup.reset()
    expect(await repositories.plans.list()).toHaveLength(0)
    expect(await repositories.metadata.get(APP_METADATA_KEYS.initialized, (value): value is boolean =>
      typeof value === 'boolean')).toBe(true)
    const legacyBackup: TrainingBackup = {
      ...backup,
      schemaVersion: 1,
      trainingPlans: backup.trainingPlans.map((row) => {
        const { deleted_at: _deletedAt, purge_at: _purgeAt, ...legacy } =
          row as Record<string, unknown>
        return legacy
      }),
    }
    await repositories.backup.restore(legacyBackup)
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    expect(await repositories.plans.list()).toHaveLength(1)
    await database.close()
  })

  it('migra 4 para 5 sem alterar dados e mantém o ciclo completo da lixeira', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
      );
    `)
    for (const migration of MIGRATIONS.slice(0, 4)) {
      await database.exec(migration.sql)
      await database.run(
        'INSERT INTO schema_migrations VALUES (?, ?, ?, ?)',
        migration.version, migration.name, migration.checksum, '2026-07-29T00:00:00.000Z',
      )
    }
    await initializeFirstInstallation(database, seedData())
    const before = await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM training_plans')
    await runMigrations(database)
    await runMigrations(database)
    expect((await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM schema_migrations',
    ))?.count).toBe(6)
    expect((await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM training_plans',
    ))?.count).toBe(before?.count)
    expect(await database.first(
      'SELECT id FROM training_plans WHERE deleted_at IS NOT NULL OR purge_at IS NOT NULL',
    )).toBeNull()
    expect(await database.first(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'training_plan_trash_lookup'`,
    )).toBeTruthy()

    const repositories = createLocalRepositories(database)
    const plan = (await repositories.plans.list())[0]!
    await expect(database.run(`
      UPDATE training_plans SET active = 0, deleted_at = ?, purge_at = NULL WHERE id = ?
    `, '2026-07-29T12:00:00.000Z', plan.id)).rejects.toThrow('lifecycle')
    await expect(database.run(`
      UPDATE training_plans SET active = 0, deleted_at = ?, purge_at = ? WHERE id = ?
    `, '2026-07-29T12:00:00.000Z', '2026-08-04T12:00:00.000Z', plan.id))
      .rejects.toThrow('lifecycle')
    const session = await repositories.sessions.start(plan.id, plan.days[0]!.id)
    await expect(repositories.planTrash.moveToTrash(plan.id)).rejects.toMatchObject({
      code: 'ACTIVE_SESSION_USES_TRAINING_PLAN',
    })
    await repositories.sessions.abandon(session.id)
    const trashed = await repositories.planTrash.moveToTrash(
      plan.id,
      '2026-07-29T12:00:00.000Z',
    )
    expect(trashed).toMatchObject({
      active: false,
      archived: false,
      deletedAt: '2026-07-29T12:00:00.000Z',
      purgeAt: '2026-08-05T12:00:00.000Z',
    })
    expect(await repositories.plans.list()).toHaveLength(0)
    expect(await repositories.planTrash.count()).toBe(1)
    await expect(repositories.plans.update(plan.id, {
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
    })).rejects.toMatchObject({ code: 'TRAINING_PLAN_IN_TRASH' })
    expect(await repositories.planTrash.restore(plan.id)).toMatchObject({
      active: false,
      archived: false,
      deletedAt: null,
      purgeAt: null,
    })

    const completed = await repositories.sessions.start(plan.id, plan.days[0]!.id)
    await repositories.sessions.complete(completed.id, null, '')
    await repositories.planTrash.moveToTrash(plan.id)
    await repositories.planTrash.deletePermanently(plan.id)
    expect((await repositories.sessions.getHistory()).some((item) =>
      item.id === completed.id && item.status === 'COMPLETED')).toBe(true)
    expect((await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM training_plan_days WHERE training_plan_id = ?',
      plan.id,
    ))?.count).toBe(0)

    const expiring = await repositories.plans.create({
      name: 'Expirada', description: '', category: 'Força', difficulty: 'Inicial',
    })
    await repositories.planTrash.moveToTrash(expiring.id, '2026-07-01T00:00:00.000Z')
    const trashBackup = await repositories.backup.export('0.4.0')
    expect(trashBackup.trainingPlans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expiring.id,
        deleted_at: '2026-07-01T00:00:00.000Z',
        purge_at: '2026-07-08T00:00:00.000Z',
      }),
    ]))
    await repositories.backup.restore(trashBackup)
    expect(await repositories.planTrash.count()).toBe(0)

    const secondExpiring = await repositories.plans.create({
      name: 'Expirada 2', description: '', category: 'Força', difficulty: 'Inicial',
    })
    await repositories.planTrash.moveToTrash(secondExpiring.id, '2026-07-01T00:00:00.000Z')
    expect(await repositories.planTrash.purgeExpired('2026-07-08T00:00:00.000Z')).toBe(1)
    await database.close()
  })

  it('protege todas as entradas da lixeira e sessões ativas ou pausadas', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    const repositories = createLocalRepositories(database)
    const plan = (await repositories.plans.list())[0]!
    const archived = await repositories.plans.archive(plan.id)
    expect(archived.archived).toBe(true)
    const fromArchive = await repositories.planTrash.moveToTrash(plan.id)
    expect(fromArchive).toMatchObject({ archived: false, active: false })
    await repositories.planTrash.restore(plan.id)

    const paused = await repositories.sessions.start(plan.id, plan.days[0]!.id)
    await repositories.sessions.pause(paused.id)
    await expect(repositories.planTrash.moveToTrash(plan.id)).rejects.toMatchObject({
      code: 'ACTIVE_SESSION_USES_TRAINING_PLAN',
    })
    await repositories.sessions.abandon(paused.id)
    await repositories.planTrash.moveToTrash(plan.id, '2026-07-01T00:00:00.000Z')
    await expect(repositories.plans.activate(plan.id)).rejects.toMatchObject({
      code: 'TRAINING_PLAN_IN_TRASH',
    })
    await expect(repositories.sessions.start(plan.id, plan.days[0]!.id)).rejects.toMatchObject({
      code: 'TRAINING_PLAN_IN_TRASH',
    })
    await expect(repositories.plans.update(plan.id, {
      name: 'Não editar',
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
    })).rejects.toMatchObject({ code: 'TRAINING_PLAN_IN_TRASH' })

    const active = await database.run(`
      INSERT INTO workout_sessions(
        training_plan_id, plan_day_id, workout_name, day_name, scheduled_date,
        started_at, status, active_slot
      ) VALUES (?, ?, 'Snapshot', 'Segunda', '2026-07-01', ?, 'IN_PROGRESS', 1)
    `, plan.id, plan.days[0]!.id, '2026-07-01T00:00:00.000Z')
    expect(await repositories.planTrash.purgeExpired('2026-07-08T00:00:00.000Z')).toBe(0)
    expect(await repositories.planTrash.count()).toBe(1)
    await database.run(
      `UPDATE workout_sessions SET status = 'PAUSED' WHERE id = ?`,
      active.lastInsertRowId,
    )
    expect(await repositories.planTrash.purgeExpired('2026-07-08T00:00:00.000Z')).toBe(0)
    expect(await repositories.planTrash.count()).toBe(1)
    await database.run(
      `UPDATE workout_sessions SET status = 'ABANDONED', active_slot = NULL WHERE id = ?`,
      active.lastInsertRowId,
    )
    expect(await repositories.planTrash.purgeExpired('2026-07-08T00:00:00.000Z')).toBe(1)
    expect(await repositories.planTrash.count()).toBe(0)
    await database.close()
  })

  it('faz rollback integral de emptyTrash e mantém contador correto', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    const repositories = createLocalRepositories(database)
    const first = (await repositories.plans.list())[0]!
    const blocked = await repositories.plans.create({
      name: 'Bloqueada', description: '', category: 'Força', difficulty: 'Inicial',
    })
    await repositories.planTrash.moveToTrash(first.id)
    await repositories.planTrash.moveToTrash(blocked.id)
    await database.exec(`
      CREATE TRIGGER fail_empty_trash
      BEFORE DELETE ON training_plans
      WHEN OLD.name = 'Bloqueada' AND OLD.deleted_at IS NOT NULL
      BEGIN
        SELECT RAISE(ABORT, 'falha injetada no emptyTrash');
      END;
    `)
    await expect(repositories.planTrash.emptyTrash()).rejects.toThrow('falha injetada')
    expect(await repositories.planTrash.count()).toBe(2)
    expect(await repositories.planTrash.list()).toHaveLength(2)
    await database.exec('DROP TRIGGER fail_empty_trash')
    expect(await repositories.planTrash.emptyTrash()).toBe(2)
    expect(await repositories.planTrash.count()).toBe(0)
    await database.close()
  })

  it('restaura backup v2 não vencido e expurga o vencido', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    const repositories = createLocalRepositories(database)
    const plan = (await repositories.plans.list())[0]!
    const deletedAt = new Date().toISOString()
    await repositories.planTrash.moveToTrash(plan.id, deletedAt)
    const backup = await repositories.backup.export('0.4.0')
    await repositories.backup.reset()
    await repositories.backup.restore(backup)
    expect(await repositories.planTrash.count()).toBe(1)
    expect((await repositories.planTrash.list())[0]).toMatchObject({
      id: plan.id,
      deletedAt,
    })

    const expired: TrainingBackup = {
      ...backup,
      trainingPlans: backup.trainingPlans.map((row) => ({
        ...row as object,
        deleted_at: '2026-07-01T00:00:00.000Z',
        purge_at: '2026-07-08T00:00:00.000Z',
      })),
    }
    await repositories.backup.restore(expired)
    expect(await repositories.planTrash.count()).toBe(0)
    await database.close()
  })

  it('migra 3 para 5 e faz upsert Wger transacional preservando IDs e dados locais', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
      );
    `)
    for (const migration of MIGRATIONS.slice(0, 3)) {
      await database.exec(migration.sql)
      await database.run(
        'INSERT INTO schema_migrations VALUES (?, ?, ?, ?)',
        migration.version, migration.name, migration.checksum, '2026-07-29T00:00:00.000Z',
      )
    }
    await initializeFirstInstallation(database, seedData())
    const beforeSeed = await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM exercise_definitions')
    await runMigrations(database)
    await runMigrations(database)
    expect((await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM schema_migrations'))?.count).toBe(6)
    expect((await database.first<{ count: number }>('SELECT COUNT(*) AS count FROM exercise_definitions'))?.count)
      .toBe(beforeSeed?.count)
    expect(await database.first<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'exercise_media_source_external'`,
    )).toBeTruthy()

    let repositories = createLocalRepositories(database)
    const candidate = wgerCandidate()
    expect(await repositories.externalExerciseImport.previewExisting([candidate])).toEqual([{
      externalId: '983', existingId: null, alreadyImported: false,
    }])
    const created = await repositories.externalExerciseImport.importSelected([candidate])
    expect(created).toMatchObject({ created: 1, updated: 0, unchanged: 0 })
    const imported = (await repositories.exercises.list({ source: 'WGER', includeArchived: true }))[0]!
    expect(imported).toMatchObject({
      id: created.affectedIds[0],
      source: 'WGER',
      externalId: '983',
      name: 'Rosca sem peso',
    })
    expect(imported.media).toHaveLength(1)
    const mediaId = imported.media[0]!.id
    const plan = (await repositories.plans.list())[0]!
    const day = plan.days[0]!
    await repositories.plans.addExercise(plan.id, day.id, {
      exerciseDefinitionId: imported.id,
      sets: 1,
      minReps: 5,
      maxReps: 10,
      plannedLoad: null,
      plannedDurationSeconds: null,
      plannedDistance: null,
      restSeconds: 30,
      plannedRpe: null,
      setType: 'NORMAL',
      notes: '',
      alternativeExerciseId: null,
    })
    const session = await repositories.sessions.start(plan.id, day.id)
    expect(session.exercises.some((item) => item.exerciseDefinitionId === imported.id)).toBe(true)
    await repositories.sessions.complete(session.id, null, '')

    const unchanged = await repositories.externalExerciseImport.importSelected([candidate])
    expect(unchanged).toMatchObject({ created: 0, updated: 0, unchanged: 1 })
    await repositories.exercises.archive(imported.id)
    await database.run('UPDATE exercise_definitions SET notes = ? WHERE id = ?', 'Nota pessoal', imported.id)
    const updated = await repositories.externalExerciseImport.importSelected([{
      ...candidate,
      name: 'Rosca atualizada',
      media: [{ ...candidate.media[0]!, remoteUrl: 'https://wger.de/media/updated.png' }],
    }])
    expect(updated).toMatchObject({ created: 0, updated: 1, unchanged: 0 })
    const after = await repositories.exercises.findById(imported.id)
    expect(after).toMatchObject({
      id: imported.id,
      name: 'Rosca atualizada',
      archived: true,
      notes: 'Nota pessoal',
    })
    expect(after?.media[0]).toMatchObject({ id: mediaId, remoteUrl: 'https://wger.de/media/updated.png' })
    expect((await repositories.sessions.getHistory())[0]?.exercises
      .find((item) => item.exerciseDefinitionId === imported.id)?.name).toBe('Rosca sem peso')
    const invalidMedia = await repositories.externalExerciseImport.importSelected([{
      ...candidate,
      externalId: '985',
      name: 'Mídia inválida',
      media: [{ ...candidate.media[0]!, externalId: 'media-985', remoteUrl: 'http://inseguro.test/a.png' }],
    }])
    expect((await repositories.exercises.findById(invalidMedia.affectedIds[0]!))?.media).toHaveLength(0)
    expect((await repositories.exercises.list({ source: 'CUSTOM', includeArchived: true }))).toHaveLength(0)
    expect((await repositories.exercises.list({ source: 'SYSTEM', includeArchived: true }))).toHaveLength(1)
    await database.close()

    database = betterDatabase(path, failOn('INSERT INTO exercise_media'))
    repositories = createLocalRepositories(database)
    await expect(repositories.externalExerciseImport.importSelected([{
      ...candidate,
      externalId: '984',
      name: 'Falha',
      media: [{ ...candidate.media[0]!, externalId: 'media-984' }],
    }])).rejects.toThrow('injetada')
    expect(await database.first<{ id: number }>(
      `SELECT id FROM exercise_definitions WHERE source = 'WGER' AND external_id = '984'`,
    )).toBeNull()
    await database.close()
  })

  it('cria todos os templates com sete dias em uma transação e mantém migration 5', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    let repositories = createLocalRepositories(database)
    for (const template of TRAINING_PLAN_TEMPLATES) {
      const plan = await repositories.plans.createWithDays({
        plan: {
          name: template.name,
          description: template.description,
          category: template.category || 'Mista',
          difficulty: template.difficulty || 'Adaptável',
        },
        days: template.days,
        templateId: template.id,
      })
      expect(plan.days).toHaveLength(7)
      expect(plan.days.map((day) => day.weekday)).toEqual([
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
      ])
      expect(plan).toMatchObject({
        active: false,
        archived: false,
        deletedAt: null,
        purgeAt: null,
      })
      expect(plan.days.flatMap((day) => day.exercises)).toHaveLength(0)
    }
    expect(await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM schema_migrations',
    )).toEqual({ count: 6 })
    await database.close()

    database = betterDatabase(path, failOn('INSERT INTO training_plan_days', 4))
    repositories = createLocalRepositories(database)
    const before = (await repositories.plans.list()).length
    await expect(repositories.plans.createWithDays({
      plan: {
        name: 'Falha transacional',
        description: '',
        category: 'Mista',
        difficulty: 'Adaptável',
      },
      days: TRAINING_PLAN_TEMPLATES[0]!.days,
    })).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(before)
    await database.close()
  })

  it('update geral preserva integralmente os sete dias persistidos', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    const repositories = createLocalRepositories(database)
    const created = await repositories.plans.createWithDays({
      plan: {
        name: 'PPL',
        description: '',
        category: 'Hipertrofia',
        difficulty: 'Intermediário',
      },
      days: TRAINING_PLAN_TEMPLATES[0]!.days,
    })
    const before = created.days
    const updated = await repositories.plans.update(created.id, {
      name: 'PPL atualizado',
      description: 'Somente dados gerais',
      category: 'Força',
      difficulty: 'Avançado',
    })
    expect(updated.days).toEqual(before)
    expect(updated).toMatchObject({
      name: 'PPL atualizado',
      description: 'Somente dados gerais',
      category: 'Força',
      difficulty: 'Avançado',
    })
    await database.close()
  })

  it('duplica completa, estrutura e sem cargas com IDs novos e nomes sem colisão', async () => {
    const path = newDatabase()
    const database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    const repositories = createLocalRepositories(database)
    const original = (await repositories.plans.list())[0]!
    const originalDay = original.days[0]!
    const originalExercise = originalDay.exercises[0]!
    await repositories.plans.updateExercise(
      original.id,
      originalDay.id,
      originalExercise.id,
      {
        sets: 3,
        minReps: 8,
        maxReps: 12,
        plannedLoad: 42,
        plannedDurationSeconds: 90,
        plannedDistance: 250,
        restSeconds: 75,
        plannedRpe: 8,
        setType: 'DROP_SET',
        notes: 'Progressão pessoal',
        alternativeExerciseId: originalExercise.exercise.id,
      },
    )
    await repositories.plans.addRestActivity(original.id, originalDay.id, {
      name: 'Caminhada',
      description: 'Leve',
      estimatedDurationMinutes: 15,
      category: 'Recuperação',
      optional: true,
    })
    const session = await repositories.sessions.start(original.id, originalDay.id)
    await repositories.sessions.complete(session.id, null, '')

    const complete = await repositories.plans.duplicate(original.id, 'COMPLETE')
    const structure = await repositories.plans.duplicate(original.id, 'STRUCTURE_ONLY')
    const withoutLoads = await repositories.plans.duplicate(original.id, 'WITHOUT_LOADS')
    expect([complete.name, structure.name, withoutLoads.name]).toEqual([
      'Ficha local — Cópia',
      'Ficha local — Cópia 2',
      'Ficha local — Cópia 3',
    ])
    for (const copy of [complete, structure, withoutLoads]) {
      expect(copy).toMatchObject({
        active: false,
        archived: false,
        deletedAt: null,
        purgeAt: null,
      })
      expect(copy.id).not.toBe(original.id)
      expect(copy.days[0]!.id).not.toBe(originalDay.id)
      expect(copy.days[0]!.exercises[0]!.id).not.toBe(originalExercise.id)
      expect(copy.days[0]!.restActivities).toHaveLength(1)
    }
    expect(complete.days[0]!.exercises[0]).toMatchObject({
      plannedLoad: 42,
      plannedRpe: 8,
      plannedDurationSeconds: 90,
      plannedDistance: 250,
      notes: 'Progressão pessoal',
      alternativeExerciseId: originalExercise.exercise.id,
    })
    expect(structure.days[0]!.exercises[0]).toMatchObject({
      sets: 3,
      minReps: 8,
      maxReps: 12,
      plannedLoad: null,
      plannedRpe: null,
      restSeconds: 75,
      setType: 'DROP_SET',
      notes: '',
      alternativeExerciseId: null,
    })
    expect(withoutLoads.days[0]!.exercises[0]).toMatchObject({
      plannedLoad: null,
      plannedRpe: 8,
      plannedDurationSeconds: 90,
      plannedDistance: 250,
      notes: 'Progressão pessoal',
      alternativeExerciseId: originalExercise.exercise.id,
    })
    expect((await repositories.plans.getById(original.id)).days[0]!.exercises[0])
      .toMatchObject({ plannedLoad: 42, notes: 'Progressão pessoal' })
    expect(await repositories.sessions.getHistory()).toHaveLength(1)
    const copyOfCopy = await repositories.plans.duplicate(complete.id, 'COMPLETE')
    expect(copyOfCopy.name).toBe('Ficha local — Cópia 4')
    await database.close()
  })

  it('reverte integralmente uma duplicação quando qualquer cópia falha', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, seedData())
    let repositories = createLocalRepositories(database)
    const original = (await repositories.plans.list())[0]!
    await repositories.plans.addRestActivity(original.id, original.days[0]!.id, {
      name: 'Mobilidade',
      description: '',
      estimatedDurationMinutes: 10,
      category: 'Mobilidade',
      optional: false,
    })
    await database.close()

    database = betterDatabase(path, failOn('INSERT INTO rest_activities'))
    repositories = createLocalRepositories(database)
    await expect(repositories.plans.duplicate(original.id, 'COMPLETE')).rejects.toThrow('injetada')
    expect(await repositories.plans.list()).toHaveLength(1)
    expect(await database.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM training_plan_days',
    )).toEqual({ count: 7 })
    await database.close()
  })

  it('migra 5 para 6 sem alterar checksums publicados e cria constraints da biblioteca', async () => {
    expect(MIGRATIONS.slice(0, 5).map((item) => item.checksum)).toEqual([
      '9fb6bd88', '2ffe7a7d', '8200ffc4', '38bebaa2', '287de8d5',
    ])
    const path = newDatabase()
    const database = betterDatabase(path)
    await database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
      )
    `)
    for (const migration of MIGRATIONS.slice(0, 5)) {
      await database.exec(migration.sql)
      await database.run(
        'INSERT INTO schema_migrations VALUES (?, ?, ?, ?)',
        migration.version, migration.name, migration.checksum, '2026-07-30T00:00:00.000Z',
      )
    }
    await initializeFirstInstallation(database, bundledSeedData())
    const before = await database.first<{ exercises: number; plans: number; sessions: number }>(`
      SELECT
        (SELECT COUNT(*) FROM exercise_definitions) AS exercises,
        (SELECT COUNT(*) FROM training_plans) AS plans,
        (SELECT COUNT(*) FROM workout_sessions) AS sessions
    `)
    await runMigrations(database)
    await runMigrations(database)
    expect(await database.first('SELECT COUNT(*) AS count FROM schema_migrations')).toEqual({ count: 6 })
    expect(await database.first<{ exercises: number; plans: number; sessions: number }>(`
      SELECT
        (SELECT COUNT(*) FROM exercise_definitions) AS exercises,
        (SELECT COUNT(*) FROM training_plans) AS plans,
        (SELECT COUNT(*) FROM workout_sessions) AS sessions
    `)).toEqual(before)
    for (const table of ['exercise_catalog_entries', 'exercise_aliases', 'exercise_favorites', 'exercise_recent_usage']) {
      expect(await database.first(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table)).toBeTruthy()
    }
    await database.run(
      `INSERT INTO exercise_aliases(exercise_id, alias, normalized_alias, origin) VALUES (1, 'Teste', 'teste', 'USER')`,
    )
    await expect(database.run(
      `INSERT INTO exercise_aliases(exercise_id, alias, normalized_alias, origin) VALUES (1, 'TESTE', 'teste', 'USER')`,
    )).rejects.toThrow('UNIQUE')
    await expect(database.run(
      `INSERT INTO exercise_favorites(exercise_id, created_at) VALUES (9999, ?)`,
      '2026-07-30T00:00:00.000Z',
    )).rejects.toThrow('FOREIGN KEY')
    await database.close()
  })

  it('sincroniza catálogo, preserva dados do usuário e mantém favoritos, recentes e backup v2', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, bundledSeedData())
    let repositories = createLocalRepositories(database)
    const legacy = await repositories.exercises.findById(1)
    const custom = await repositories.exercises.create({
      name: 'Exercício do usuário', description: 'Não alterar', primaryMuscleGroup: 'Teste',
      secondaryMuscleGroups: [], equipment: 'Livre', category: 'STRENGTH',
      difficulty: 'Livre', instructions: 'Do usuário', notes: 'Nota customizada',
      unilateral: false, timed: false,
    })
    await repositories.externalExerciseImport.importSelected([wgerCandidate()])

    const first = await syncBundledCatalog(database, bundledCatalog())
    expect(first.created).toBe(39)
    expect((await repositories.exercises.list({ source: 'BUNDLED' }))).toHaveLength(40)
    expect((await repositories.exercises.search('puxador frente'))[0]?.externalId)
      .toBe('puxada_frente_maquina')
    expect(await repositories.exercises.list({ hasMedia: true })).toMatchObject([
      { source: 'WGER', name: 'Rosca sem peso' },
    ])
    expect(await repositories.exercises.list({ muscle: 'Tríceps' })).not.toHaveLength(0)
    expect(await repositories.exercises.list({ equipment: 'Máquina' })).not.toHaveLength(0)
    const pushUp = (await repositories.exercises.list({ source: 'BUNDLED' }))
      .find((item) => item.externalId === 'flexao_bracos')!
    expect(pushUp.id).toBe(legacy?.id)
    await repositories.exercises.updateNotes(pushUp.id, 'Minha observação')
    await repositories.exercises.setFavorite(pushUp.id, true)
    await repositories.exercises.recordRecentUsage(pushUp.id, '2026-07-30T10:00:00.000Z')
    await repositories.exercises.recordRecentUsage(pushUp.id, '2026-07-30T11:00:00.000Z')
    await database.run(`
      INSERT INTO exercise_aliases(exercise_id, alias, normalized_alias, origin)
      VALUES (?, 'Meu apoio', 'meu apoio', 'USER')
    `, pushUp.id)
    const recentFromPlan = (await repositories.exercises.list({ source: 'BUNDLED' }))
      .find((item) => item.externalId === 'supino_reto_halteres')!
    const plan = (await repositories.plans.list())[0]!
    await repositories.plans.addExercise(plan.id, plan.days[0]!.id, {
      exerciseDefinitionId: recentFromPlan.id,
      sets: 2, minReps: 6, maxReps: 10, plannedLoad: null,
      plannedDurationSeconds: null, plannedDistance: null, restSeconds: 60,
      plannedRpe: null, setType: 'NORMAL', notes: '', alternativeExerciseId: null,
    })
    expect((await repositories.exercises.findById(recentFromPlan.id))?.useCount).toBe(1)
    const archived = (await repositories.exercises.list({ source: 'BUNDLED' }))
      .find((item) => item.externalId === 'supino_reto_barra')!
    await repositories.exercises.archive(archived.id)

    expect(await syncBundledCatalog(database, bundledCatalog())).toEqual({ created: 0, updated: 0 })
    const changed = bundledCatalog()
    changed.version = 3
    changed.exercises = changed.exercises.map((item) => item.slug === 'flexao_bracos'
      ? Object.freeze({
          ...item,
          name: 'Flexão de braços atualizada',
          normalizedName: 'flexao de bracos atualizada',
        })
      : item)
    await syncBundledCatalog(database, changed)
    const preserved = await repositories.exercises.findById(pushUp.id)
    expect(preserved).toMatchObject({
      id: pushUp.id,
      name: 'Flexão de braços atualizada',
      notes: 'Minha observação',
      favorite: true,
      useCount: 2,
      lastUsedAt: '2026-07-30T11:00:00.000Z',
    })
    expect((await repositories.exercises.findById(archived.id))?.archived).toBe(true)
    expect(await repositories.exercises.findById(custom.id)).toMatchObject({
      name: 'Exercício do usuário', notes: 'Nota customizada', source: 'CUSTOM',
    })
    expect((await repositories.exercises.list({ source: 'WGER', includeArchived: true }))[0])
      .toMatchObject({ externalId: '983', name: 'Rosca sem peso' })

    const backup = await repositories.backup.export('0.8.0')
    expect(backup.schemaVersion).toBe(2)
    expect(backup.exerciseFavorites).toHaveLength(1)
    expect(backup.exerciseRecentUsage).toHaveLength(2)
    expect(backup.exerciseAliases).toHaveLength(1)
    const backupWithUi = {
      ...backup,
      uiPreferences: {
        themePreset: 'DRACULA',
        appearance: 'DARK',
        motion: 'REDUCED',
        workoutHighContrast: true,
        hapticsEnabled: false,
      },
    }
    await repositories.backup.reset()
    await repositories.backup.restore(backupWithUi)
    await syncBundledCatalog(database, bundledCatalog())
    expect((await repositories.exercises.findById(pushUp.id))?.favorite).toBe(true)
    const oldV2 = { ...backup }
    delete oldV2.exerciseAliases
    delete oldV2.exerciseFavorites
    delete oldV2.exerciseRecentUsage
    await repositories.backup.restore(oldV2)
    await syncBundledCatalog(database, bundledCatalog())
    expect(await repositories.exercises.list({ source: 'BUNDLED', includeArchived: true })).toHaveLength(40)
    await expect(repositories.backup.restore({
      ...backup,
      exerciseFavorites: [{ exercise_id: pushUp.id, created_at: 'inválido' }],
    })).rejects.toThrow('favorito')
    await expect(repositories.backup.restore({
      ...backup,
      uiPreferences: { themePreset: 'QUALQUER' },
    })).rejects.toThrow('preferências')

    await database.close()
    database = betterDatabase(path)
    repositories = createLocalRepositories(database)
    expect(await repositories.exercises.list({ source: 'BUNDLED', includeArchived: true })).toHaveLength(40)
    await database.close()
  })

  it('reverte integralmente uma sincronização interrompida', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    await database.close()
    database = betterDatabase(path, failOn('INSERT INTO exercise_catalog_entries', 2))
    await expect(syncBundledCatalog(database, bundledCatalog())).rejects.toThrow('injetada')
    expect(await database.first('SELECT COUNT(*) AS count FROM exercise_definitions')).toEqual({ count: 0 })
    expect(await database.first('SELECT COUNT(*) AS count FROM exercise_catalog_entries')).toEqual({ count: 0 })
    await database.close()
  })

  it('reverte toda a restauração quando a sincronização do catálogo falha', async () => {
    const path = newDatabase()
    let database = betterDatabase(path)
    await runMigrations(database)
    await initializeFirstInstallation(database, bundledSeedData())
    await syncBundledCatalog(database, bundledCatalog())
    let repositories = createLocalRepositories(database)
    const backup = await repositories.backup.export('0.8.0')
    const original = await repositories.exercises.create({
      name: 'Estado anterior preservado', description: '', primaryMuscleGroup: 'Teste',
      secondaryMuscleGroups: [], equipment: 'Sem equipamento', category: 'STRENGTH',
      difficulty: 'Teste', instructions: '', notes: 'Não apagar',
      unilateral: false, timed: false,
    })
    await database.close()

    database = betterDatabase(path, failOn('INSERT INTO exercise_catalog_entries'))
    repositories = createLocalRepositories(database)
    await expect(repositories.backup.restore(backup)).rejects.toThrow('injetada')
    expect(await repositories.exercises.findById(original.id)).toMatchObject({
      name: 'Estado anterior preservado',
      notes: 'Não apagar',
    })
    expect(await repositories.exercises.list({ source: 'BUNDLED' })).toHaveLength(40)
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

function wgerCandidate(): ExternalExerciseCandidate {
  return {
    provider: 'WGER',
    externalId: '983',
    name: 'Rosca sem peso',
    description: 'Descrição',
    primaryMuscleGroup: 'Bíceps',
    secondaryMuscleGroups: [],
    equipment: 'Peso corporal',
    category: 'STRENGTH',
    difficulty: 'Não informado',
    instructions: 'Instruções',
    unilateral: false,
    timed: false,
    sourceUrl: 'https://wger.de/en/exercise/983/view',
    licenseName: 'CC-BY-SA 4',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'wger.de',
    media: [{
      type: 'IMAGE',
      source: 'WGER',
      externalId: 'media-983',
      remoteUrl: 'https://wger.de/media/example.png',
      thumbnailRemoteUrl: null,
      mimeType: 'image/png',
      width: null,
      height: null,
      durationSeconds: null,
      main: true,
      sortOrder: 0,
      licenseName: 'CC-BY-SA 4',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      author: 'wger.de',
      sourceUrl: 'https://wger.de/en/exercise/983/view',
    }],
    warnings: [],
    language: 'pt',
    original: {},
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

function bundledCatalog() {
  return { version: 2, exercises: [...BUNDLED_EXERCISES] }
}

function bundledSeedData(): SeedData {
  const first = BUNDLED_EXERCISES[0]!
  return {
    ...seedData(),
    exercises: [{
      key: 'push_up',
      name: first.name,
      description: first.description,
      primaryMuscleGroup: first.primaryMuscleGroup,
      secondaryMuscleGroups: [...first.secondaryMuscleGroups],
      equipment: first.equipment,
      category: first.category,
      difficulty: first.difficulty,
      instructions: first.instructions,
      notes: '',
      unilateral: first.unilateral,
      timed: first.timed,
    }],
  }
}

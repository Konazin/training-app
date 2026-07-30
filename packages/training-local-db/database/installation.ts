import { parseJson, serializeJson } from '@training/training-domain'
import type { SqlDatabase } from '.'
import { insertSeed, type SeedData } from './seed'

export const APP_METADATA_KEYS = {
  initialized: 'installation.initialized',
  seedVersion: 'seed.version',
  seedSuppressed: 'seed.suppressed',
  automaticBackups: 'last.automatic.backup',
  lastStartup: 'last.successful.startup',
  onboardingEligible: 'onboarding.eligible',
  onboardingComplete: 'onboarding.complete',
} as const

export interface AppMetadataRepository {
  get<T>(key: string, validate: (value: unknown) => value is T): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

export function createAppMetadataRepository(database: SqlDatabase): AppMetadataRepository {
  return {
    get: async <T>(key: string, validate: (value: unknown) => value is T) => {
      const row = await database.first<{ value_json: string }>(
        'SELECT value_json FROM app_metadata WHERE key = ?',
        key,
      )
      return row ? parseJson(row.value_json, validate) : null
    },
    set: (key, value) => setMetadata(database, key, value),
    remove: async (key) => {
      await database.run('DELETE FROM app_metadata WHERE key = ?', key)
    },
  }
}

export async function initializeFirstInstallation(database: SqlDatabase, seed: SeedData) {
  if (await metadataValue(database, APP_METADATA_KEYS.initialized) === true) return false
  await database.transaction(async (transaction) => {
    if (await metadataValue(transaction, APP_METADATA_KEYS.initialized) === true) return
    const existing = await transaction.first<{ value: number }>(`
      SELECT
        (SELECT COUNT(*) FROM exercise_definitions)
        + (SELECT COUNT(*) FROM training_plans)
        + (SELECT COUNT(*) FROM workout_sessions) AS value
    `)
    if ((existing?.value ?? 0) === 0) await insertSeed(transaction, seed)
    await setMetadata(transaction, APP_METADATA_KEYS.initialized, true)
    await setMetadata(transaction, APP_METADATA_KEYS.seedVersion, seed.version)
    await setMetadata(transaction, APP_METADATA_KEYS.seedSuppressed, false)
    await setMetadata(transaction, APP_METADATA_KEYS.onboardingEligible, true)
    await setMetadata(transaction, APP_METADATA_KEYS.onboardingComplete, false)
  })
  return true
}

export async function clearUserData(database: SqlDatabase) {
  await database.transaction(async (transaction) => {
    await deleteUserRows(transaction)
    await setMetadata(transaction, APP_METADATA_KEYS.initialized, true)
    await setMetadata(transaction, APP_METADATA_KEYS.seedSuppressed, true)
  })
}

export async function resetToSeed(database: SqlDatabase, seed: SeedData) {
  await database.transaction(async (transaction) => {
    await deleteUserRows(transaction)
    await insertSeed(transaction, seed)
    await setMetadata(transaction, APP_METADATA_KEYS.initialized, true)
    await setMetadata(transaction, APP_METADATA_KEYS.seedVersion, seed.version)
    await setMetadata(transaction, APP_METADATA_KEYS.seedSuppressed, false)
  })
}

export async function markSuccessfulStartup(database: SqlDatabase, now = new Date()) {
  await setMetadata(database, APP_METADATA_KEYS.lastStartup, now.toISOString())
}

export async function deleteUserRows(database: SqlDatabase) {
  for (const table of [
    'workout_set_logs',
    'workout_session_exercises',
    'workout_sessions',
    'rest_activities',
    'training_day_exercises',
    'training_plan_days',
    'training_plans',
    'exercise_media',
    'exercise_definitions',
    'app_settings',
  ]) {
    await database.run(`DELETE FROM ${table}`)
  }
}

async function metadataValue(database: SqlDatabase, key: string) {
  const row = await database.first<{ value_json: string }>(
    'SELECT value_json FROM app_metadata WHERE key = ?',
    key,
  )
  return row ? JSON.parse(row.value_json) as unknown : null
}

async function setMetadata(database: SqlDatabase, key: string, value: unknown) {
  await database.run(`
    INSERT INTO app_metadata(key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `, key, serializeJson(value), new Date().toISOString())
}

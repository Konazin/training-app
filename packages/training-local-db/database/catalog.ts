import {
  normalizeName,
  serializeJson,
  type BundledExercise,
  type ExerciseCategory,
} from '@training/training-domain'
import type { SqlDatabase } from '.'

const CATEGORIES: readonly ExerciseCategory[] = [
  'STRENGTH', 'HYPERTROPHY', 'ENDURANCE', 'CARDIO',
  'MOBILITY', 'STRETCHING', 'TECHNIQUE', 'RECOVERY',
]

export interface BundledCatalog {
  version: number
  exercises: readonly BundledExercise[]
}

export interface CatalogSyncResult {
  created: number
  updated: number
}

export function validateBundledCatalog(catalog: BundledCatalog) {
  if (!Number.isInteger(catalog.version) || catalog.version < 1 || !Array.isArray(catalog.exercises)) {
    throw new Error('Catálogo integrado inválido.')
  }
  const slugs = new Set<string>()
  for (const exercise of catalog.exercises) {
    if (
      !/^[a-z0-9_]+$/.test(exercise.slug)
      || exercise.externalId !== exercise.slug
      || slugs.has(exercise.slug)
      || !exercise.name.trim()
      || exercise.normalizedName !== normalizeName(exercise.name)
      || !exercise.primaryMuscleGroup.trim()
      || !exercise.equipment.trim()
      || !CATEGORIES.includes(exercise.category)
      || !exercise.description.trim()
      || !exercise.instructions.trim()
      || !['STRENGTH', 'MOBILITY', 'CARDIO', 'BODYWEIGHT', 'EQUIPMENT'].includes(exercise.media.placeholder)
    ) throw new Error(`Exercício integrado inválido: ${exercise.slug || 'sem slug'}.`)
    slugs.add(exercise.slug)
  }
  return catalog
}

export async function syncBundledCatalog(
  database: SqlDatabase,
  input: BundledCatalog,
): Promise<CatalogSyncResult> {
  const catalog = validateBundledCatalog(input)
  return database.transaction(async (transaction) => {
    const result: CatalogSyncResult = { created: 0, updated: 0 }
    const timestamp = new Date().toISOString()
    for (const exercise of catalog.exercises) {
      const entry = await transaction.first<{ exercise_id: number; catalog_version: number }>(`
        SELECT exercise_id, catalog_version FROM exercise_catalog_entries
        WHERE source = 'BUNDLED' AND external_id = ?
      `, exercise.externalId)
      if (entry?.catalog_version === catalog.version) continue
      const legacyNames = [...new Set([
        exercise.normalizedName,
        ...exercise.aliases.map(normalizeName),
      ])]
      const legacy = entry ? null : await transaction.first<{ id: number }>(`
        SELECT definition.id FROM exercise_definitions definition
        LEFT JOIN exercise_catalog_entries catalog ON catalog.exercise_id = definition.id
        WHERE definition.source = 'SYSTEM'
          AND (
            definition.external_id = ?
            OR definition.normalized_name IN (${legacyNames.map(() => '?').join(',')})
          )
          AND catalog.exercise_id IS NULL
        ORDER BY CASE WHEN definition.external_id = ? THEN 0 ELSE 1 END, definition.id
        LIMIT 1
      `, `bundled:${exercise.externalId}`, ...legacyNames, `bundled:${exercise.externalId}`)
      let exerciseId = entry?.exercise_id ?? legacy?.id
      if (exerciseId) {
        await transaction.run(`
          UPDATE exercise_definitions SET
            name = ?, normalized_name = ?, description = ?, primary_muscle_group = ?,
            secondary_muscle_groups_json = ?, equipment = ?, category = ?, difficulty = ?,
            instructions = ?, unilateral = ?, timed = ?, external_id = ?, updated_at = ?
          WHERE id = ? AND source = 'SYSTEM'
        `, exercise.name, exercise.normalizedName, exercise.description,
        exercise.primaryMuscleGroup, serializeJson(exercise.secondaryMuscleGroups),
        exercise.equipment, exercise.category, exercise.difficulty, exercise.instructions,
        Number(exercise.unilateral), Number(exercise.timed), `bundled:${exercise.externalId}`,
        timestamp, exerciseId)
        result.updated += 1
      } else {
        const inserted = await transaction.run(`
          INSERT INTO exercise_definitions(
            name, normalized_name, description, primary_muscle_group,
            secondary_muscle_groups_json, equipment, category, difficulty,
            instructions, notes, unilateral, timed, source, external_id,
            archived, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'SYSTEM', ?, 0, ?, ?)
        `, exercise.name, exercise.normalizedName, exercise.description,
        exercise.primaryMuscleGroup, serializeJson(exercise.secondaryMuscleGroups),
        exercise.equipment, exercise.category, exercise.difficulty, exercise.instructions,
        Number(exercise.unilateral), Number(exercise.timed), `bundled:${exercise.externalId}`,
        timestamp, timestamp)
        exerciseId = inserted.lastInsertRowId
        result.created += 1
      }
      await transaction.run(`
        INSERT INTO exercise_catalog_entries(
          exercise_id, source, external_id, catalog_version, placeholder_kind, synced_at
        ) VALUES (?, 'BUNDLED', ?, ?, ?, ?)
        ON CONFLICT(exercise_id) DO UPDATE SET
          external_id = excluded.external_id,
          catalog_version = excluded.catalog_version,
          placeholder_kind = excluded.placeholder_kind,
          synced_at = excluded.synced_at
      `, exerciseId, exercise.externalId, catalog.version, exercise.media.placeholder, timestamp)
      await transaction.run(
        `DELETE FROM exercise_aliases WHERE exercise_id = ? AND origin = 'BUNDLED'`,
        exerciseId,
      )
      for (const alias of exercise.aliases) {
        const normalized = normalizeName(alias)
        if (!normalized) continue
        await transaction.run(`
          INSERT INTO exercise_aliases(exercise_id, alias, normalized_alias, origin)
          VALUES (?, ?, ?, 'BUNDLED')
          ON CONFLICT(exercise_id, normalized_alias) DO NOTHING
        `, exerciseId, alias.trim(), normalized)
      }
      const mediaExternalId = `bundled:${exercise.externalId}:placeholder`
      await transaction.run(`
        INSERT INTO exercise_media(
          exercise_definition_id, type, source, external_id, local_uri, mime_type,
          is_main, sort_order, author, created_at, updated_at
        ) VALUES (?, 'IMAGE', 'SYSTEM', ?, ?, 'application/x-training-placeholder',
          1, 0, ?, ?, ?)
        ON CONFLICT(source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
          exercise_definition_id = excluded.exercise_definition_id,
          local_uri = excluded.local_uri,
          mime_type = excluded.mime_type,
          is_main = 1,
          sort_order = 0,
          author = excluded.author,
          updated_at = excluded.updated_at
      `, exerciseId, mediaExternalId, `placeholder://${exercise.media.placeholder.toLowerCase()}`,
      exercise.media.attribution, timestamp, timestamp)
    }
    return result
  })
}

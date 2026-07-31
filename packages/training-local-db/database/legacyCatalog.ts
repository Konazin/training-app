import type { SqlDatabase } from '.'

/**
 * Mantém definições antigas para restaurar referências históricas, mas nunca
 * volta a apresentá-las como conteúdo canônico.
 */
export async function retireLegacyGeneratedExercises(database: SqlDatabase) {
  await database.run(`
    UPDATE exercise_definitions
    SET archived = 1, updated_at = ?
    WHERE source = 'SYSTEM' AND archived = 0
  `, new Date().toISOString())
}

import {
  aggregateNutritionDay, normalizeMicronutrients, validateNutritionItem,
  localDateKey,
  type DailyNutritionSummary, type NutritionGoals, type NutritionMeal, type NutritionMealInput,
  type NutritionMealItem, type NutritionMealRepository, type NutritionSummaryRepository,
  type NutritionMaintenanceRepository,
} from '@training/training-domain'
import type { SqlDatabase } from '../database'

export const NUTRITION_GOALS_KEY = 'nutrition.goals'
const parse = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) as T : fallback } catch { return fallback } }
const goals = (value: unknown): NutritionGoals => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const positive = (key: string) => typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key]! > 0 ? item[key] as number : null
  return { caloriesKcal: positive('caloriesKcal'), proteinGrams: positive('proteinGrams'), carbohydratesGrams: positive('carbohydratesGrams'), fatGrams: positive('fatGrams'), fiberGrams: positive('fiberGrams') }
}
const itemFromRow = (row: Record<string, unknown>): NutritionMealItem => ({
  id: Number(row.id), mealId: Number(row.meal_id), name: String(row.name), portionDescription: String(row.portion_description ?? ''), estimatedGrams: row.estimated_grams == null ? null : Number(row.estimated_grams), caloriesKcal: Number(row.calories_kcal), proteinGrams: Number(row.protein_grams), carbohydratesGrams: Number(row.carbohydrates_grams), fatGrams: Number(row.fat_grams), fiberGrams: Number(row.fiber_grams), micronutrients: normalizeMicronutrients(parse(row.micronutrients_json, {})), confidence: row.confidence == null ? null : Number(row.confidence), dataSource: String(row.data_source) as NutritionMealItem['dataSource'], sortOrder: Number(row.sort_order), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
})
async function loadMeals(database: SqlDatabase, where: string, ...params: (string | number)[]) {
  const rows = await database.all<Record<string, unknown>>(`SELECT * FROM nutrition_meals WHERE ${where} ORDER BY local_date, consumed_at, id`, ...params)
  if (!rows.length) return [] as NutritionMeal[]
  const itemRows = await database.all<Record<string, unknown>>(`SELECT * FROM nutrition_meal_items WHERE meal_id IN (${rows.map(() => '?').join(',')}) ORDER BY meal_id, sort_order, id`, ...rows.map((row) => Number(row.id)))
  const byMeal = new Map<number, NutritionMealItem[]>()
  for (const row of itemRows) { const item = itemFromRow(row); byMeal.set(item.mealId, [...(byMeal.get(item.mealId) ?? []), item]) }
  return rows.map((row): NutritionMeal => ({ id: Number(row.id), localDate: String(row.local_date), consumedAt: String(row.consumed_at), mealType: String(row.meal_type) as NutritionMeal['mealType'], title: String(row.title ?? ''), notes: String(row.notes ?? ''), source: String(row.source) as NutritionMeal['source'], createdAt: String(row.created_at), updatedAt: String(row.updated_at), items: byMeal.get(Number(row.id)) ?? [] }))
}
function mealRepository(database: SqlDatabase): NutritionMealRepository {
  const save = (id: number | null, input: NutritionMealInput) => database.transaction(async (tx) => {
    if (!input.items.length) throw new Error('A refeição precisa de pelo menos um alimento.')
    const items = input.items.map(validateNutritionItem); const now = new Date().toISOString(); let mealId = id
    if (mealId == null) mealId = (await tx.run('INSERT INTO nutrition_meals(local_date,consumed_at,meal_type,title,notes,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', input.localDate, input.consumedAt, input.mealType, input.title.trim(), input.notes.trim(), input.source, now, now)).lastInsertRowId
    else { await tx.run('UPDATE nutrition_meals SET local_date=?,consumed_at=?,meal_type=?,title=?,notes=?,source=?,updated_at=? WHERE id=?', input.localDate, input.consumedAt, input.mealType, input.title.trim(), input.notes.trim(), input.source, now, mealId); await tx.run('DELETE FROM nutrition_meal_items WHERE meal_id=?', mealId) }
    for (const [sortOrder, item] of items.entries()) await tx.run('INSERT INTO nutrition_meal_items(meal_id,name,portion_description,estimated_grams,calories_kcal,protein_grams,carbohydrates_grams,fat_grams,fiber_grams,micronutrients_json,confidence,data_source,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', mealId, item.name, item.portionDescription, item.estimatedGrams, item.caloriesKcal, item.proteinGrams, item.carbohydratesGrams, item.fatGrams, item.fiberGrams, JSON.stringify(item.micronutrients), item.confidence, item.dataSource, sortOrder, now, now)
    return (await loadMeals(tx, 'id=?', mealId))[0]!
  })
  return { create: (input) => save(null, input), update: (id, input) => save(id, input), delete: (id) => database.transaction(async (tx) => { await tx.run('DELETE FROM nutrition_meals WHERE id=?', id) }), findById: async (id) => (await loadMeals(database, 'id=?', id))[0] ?? null, listByDate: (date) => loadMeals(database, 'local_date=?', date), listBetweenDates: (start, end) => loadMeals(database, 'local_date BETWEEN ? AND ?', start, end) }
}
function summaryRepository(database: SqlDatabase): NutritionSummaryRepository {
  const map = (row: Record<string, unknown>): DailyNutritionSummary => ({ id: Number(row.id), localDate: String(row.local_date), totalCaloriesKcal: Number(row.total_calories_kcal), totalProteinGrams: Number(row.total_protein_grams), totalCarbohydratesGrams: Number(row.total_carbohydrates_grams), totalFatGrams: Number(row.total_fat_grams), totalFiberGrams: Number(row.total_fiber_grams), totalMicronutrients: parse(row.total_micronutrients_json, {}), mealCount: Number(row.meal_count), itemCount: Number(row.item_count), goalCaloriesKcal: row.goal_calories_kcal == null ? null : Number(row.goal_calories_kcal), goalProteinGrams: row.goal_protein_grams == null ? null : Number(row.goal_protein_grams), goalCarbohydratesGrams: row.goal_carbohydrates_grams == null ? null : Number(row.goal_carbohydrates_grams), goalFatGrams: row.goal_fat_grams == null ? null : Number(row.goal_fat_grams), goalFiberGrams: row.goal_fiber_grams == null ? null : Number(row.goal_fiber_grams), closedAt: String(row.closed_at), updatedAt: String(row.updated_at) })
  const select = async (sql: string, ...params: (string | number)[]) => (await database.all<Record<string, unknown>>(sql, ...params)).map(map)
  return {
    findByDate: async (date) => (await select('SELECT * FROM nutrition_daily_summaries WHERE local_date=?', date))[0] ?? null,
    listBetweenDates: (start, end) => select('SELECT * FROM nutrition_daily_summaries WHERE local_date BETWEEN ? AND ? ORDER BY local_date DESC', start, end),
    upsert: async (input) => {
      const now = new Date().toISOString()
      await database.run('INSERT INTO nutrition_daily_summaries(local_date,total_calories_kcal,total_protein_grams,total_carbohydrates_grams,total_fat_grams,total_fiber_grams,total_micronutrients_json,meal_count,item_count,goal_calories_kcal,goal_protein_grams,goal_carbohydrates_grams,goal_fat_grams,goal_fiber_grams,closed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(local_date) DO UPDATE SET total_calories_kcal=excluded.total_calories_kcal,total_protein_grams=excluded.total_protein_grams,total_carbohydrates_grams=excluded.total_carbohydrates_grams,total_fat_grams=excluded.total_fat_grams,total_fiber_grams=excluded.total_fiber_grams,total_micronutrients_json=excluded.total_micronutrients_json,meal_count=excluded.meal_count,item_count=excluded.item_count,goal_calories_kcal=excluded.goal_calories_kcal,goal_protein_grams=excluded.goal_protein_grams,goal_carbohydrates_grams=excluded.goal_carbohydrates_grams,goal_fat_grams=excluded.goal_fat_grams,goal_fiber_grams=excluded.goal_fiber_grams,closed_at=excluded.closed_at,updated_at=excluded.updated_at', input.localDate, input.totalCaloriesKcal, input.totalProteinGrams, input.totalCarbohydratesGrams, input.totalFatGrams, input.totalFiberGrams, JSON.stringify(input.totalMicronutrients), input.mealCount, input.itemCount, input.goalCaloriesKcal, input.goalProteinGrams, input.goalCarbohydratesGrams, input.goalFatGrams, input.goalFiberGrams, input.closedAt, now)
      return (await select('SELECT * FROM nutrition_daily_summaries WHERE local_date=?', input.localDate))[0]!
    },
  }
}
export function nutritionRepositories(database: SqlDatabase) {
  const meals = mealRepository(database); const summaries = summaryRepository(database)
  const aggregateDay = async (date: string) => {
    const [settingsRow, existing] = await Promise.all([
      database.first<{ value_json: string }>('SELECT value_json FROM app_settings WHERE key=?', NUTRITION_GOALS_KEY),
      summaries.findByDate(date),
    ])
    const currentGoals = goals(parse(settingsRow?.value_json, {}))
    const preservedGoals = existing && date < localDateKey(new Date()) ? { caloriesKcal: existing.goalCaloriesKcal, proteinGrams: existing.goalProteinGrams, carbohydratesGrams: existing.goalCarbohydratesGrams, fatGrams: existing.goalFatGrams, fiberGrams: existing.goalFiberGrams } : currentGoals
    const value = aggregateNutritionDay(await meals.listByDate(date), preservedGoals)
    return value ? summaries.upsert(value) : null
  }
  const maintenance: NutritionMaintenanceRepository = { aggregateDay, closePendingDays: async (today) => { const rows = await database.all<{ local_date: string }>('SELECT DISTINCT local_date FROM nutrition_meals WHERE local_date < ?', today); for (const row of rows) await aggregateDay(row.local_date) }, purgeExpiredMealDetails: async (today, retentionDays = 7) => { const threshold = new Date(`${today}T00:00:00Z`); threshold.setUTCDate(threshold.getUTCDate() - retentionDays); const result = await database.run('DELETE FROM nutrition_meals WHERE local_date < ? AND EXISTS (SELECT 1 FROM nutrition_daily_summaries s WHERE s.local_date=nutrition_meals.local_date)', threshold.toISOString().slice(0, 10)); return result.changes }, run: async (today) => { await maintenance.closePendingDays(today); await maintenance.purgeExpiredMealDetails(today) } }
  return { meals, summaries, maintenance }
}

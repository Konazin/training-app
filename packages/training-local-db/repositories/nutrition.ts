import {
  aggregateNutritionDay, localDateKey, normalizeMicronutrients, validateNutritionGoals, validateNutritionItem,
  NutritionDataError,
  validateNutritionDate, validateNutritionMealInput,
  type DailyNutritionSummary, type DailyNutritionSummaryInput, type NutritionGoals, type NutritionMeal, type NutritionMealInput,
  type NutritionMealItem, type NutritionMealRepository, type NutritionSummaryRepository, type NutritionMaintenanceRepository,
} from '@training/training-domain'
import type { SqlDatabase } from '../database'

export const NUTRITION_GOALS_KEY = 'nutrition.goals'
const parse = <T>(value: unknown, fallback: T, label: string): T => {
  if (typeof value !== 'string') return fallback
  try { return JSON.parse(value) as T } catch (cause) { throw new NutritionDataError(`Dados nutricionais inválidos: ${label}.`, cause) }
}
const goals = (value: unknown): NutritionGoals => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const result = { caloriesKcal: valueOf(item.caloriesKcal), proteinGrams: valueOf(item.proteinGrams), carbohydratesGrams: valueOf(item.carbohydratesGrams), fatGrams: valueOf(item.fatGrams), fiberGrams: valueOf(item.fiberGrams) }
  return validateNutritionGoals(result)
}
const valueOf = (value: unknown) => value === null || value === undefined ? null : value as number

function itemFromRow(row: Record<string, unknown>): NutritionMealItem {
  return {
    id: Number(row.id), mealId: Number(row.meal_id), name: String(row.name), portionDescription: String(row.portion_description ?? ''), estimatedGrams: row.estimated_grams == null ? null : Number(row.estimated_grams), caloriesKcal: Number(row.calories_kcal), proteinGrams: Number(row.protein_grams), carbohydratesGrams: Number(row.carbohydrates_grams), fatGrams: Number(row.fat_grams), fiberGrams: Number(row.fiber_grams), micronutrients: normalizeMicronutrients(parse(row.micronutrients_json, {}, `micronutrientes do item ${row.id}`)), confidence: row.confidence == null ? null : Number(row.confidence), dataSource: String(row.data_source) as NutritionMealItem['dataSource'], sortOrder: Number(row.sort_order), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

async function loadMeals(database: SqlDatabase, where: string, ...params: (string | number)[]): Promise<NutritionMeal[]> {
  const rows = await database.all<Record<string, unknown>>(`SELECT * FROM nutrition_meals WHERE ${where} ORDER BY local_date, consumed_at, id`, ...params)
  if (!rows.length) return []
  const itemRows = await database.all<Record<string, unknown>>(`SELECT * FROM nutrition_meal_items WHERE meal_id IN (${rows.map(() => '?').join(',')}) ORDER BY meal_id, sort_order, id`, ...rows.map((row) => Number(row.id)))
  const byMeal = new Map<number, NutritionMealItem[]>()
  for (const row of itemRows) {
    const item = itemFromRow(row)
    byMeal.set(item.mealId, [...(byMeal.get(item.mealId) ?? []), item])
  }
  return rows.map((row): NutritionMeal => ({ id: Number(row.id), localDate: String(row.local_date), consumedAt: String(row.consumed_at), mealType: String(row.meal_type) as NutritionMeal['mealType'], title: String(row.title ?? ''), notes: String(row.notes ?? ''), source: String(row.source) as NutritionMeal['source'], createdAt: String(row.created_at), updatedAt: String(row.updated_at), items: byMeal.get(Number(row.id)) ?? [] }))
}

function summaryFromRow(row: Record<string, unknown>): DailyNutritionSummary {
  return { id: Number(row.id), localDate: String(row.local_date), totalCaloriesKcal: Number(row.total_calories_kcal), totalProteinGrams: Number(row.total_protein_grams), totalCarbohydratesGrams: Number(row.total_carbohydrates_grams), totalFatGrams: Number(row.total_fat_grams), totalFiberGrams: Number(row.total_fiber_grams), totalMicronutrients: parse(row.total_micronutrients_json, {}, `micronutrientes do resumo ${row.local_date}`), mealCount: Number(row.meal_count), itemCount: Number(row.item_count), goalCaloriesKcal: row.goal_calories_kcal == null ? null : Number(row.goal_calories_kcal), goalProteinGrams: row.goal_protein_grams == null ? null : Number(row.goal_protein_grams), goalCarbohydratesGrams: row.goal_carbohydrates_grams == null ? null : Number(row.goal_carbohydrates_grams), goalFatGrams: row.goal_fat_grams == null ? null : Number(row.goal_fat_grams), goalFiberGrams: row.goal_fiber_grams == null ? null : Number(row.goal_fiber_grams), closedAt: String(row.closed_at), finalized: row.finalized === 1, detailsPurgedAt: row.details_purged_at == null ? null : String(row.details_purged_at), updatedAt: String(row.updated_at) }
}
async function findSummary(database: SqlDatabase, date: string) { const row = await database.first<Record<string, unknown>>('SELECT * FROM nutrition_daily_summaries WHERE local_date=?', date); return row ? summaryFromRow(row) : null }
async function upsertSummary(database: SqlDatabase, input: DailyNutritionSummaryInput): Promise<DailyNutritionSummary> {
  const existing = await findSummary(database, input.localDate)
  if (existing?.finalized) return existing
  const now = new Date().toISOString()
  await database.run('INSERT INTO nutrition_daily_summaries(local_date,total_calories_kcal,total_protein_grams,total_carbohydrates_grams,total_fat_grams,total_fiber_grams,total_micronutrients_json,meal_count,item_count,goal_calories_kcal,goal_protein_grams,goal_carbohydrates_grams,goal_fat_grams,goal_fiber_grams,closed_at,finalized,details_purged_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(local_date) DO UPDATE SET total_calories_kcal=excluded.total_calories_kcal,total_protein_grams=excluded.total_protein_grams,total_carbohydrates_grams=excluded.total_carbohydrates_grams,total_fat_grams=excluded.total_fat_grams,total_fiber_grams=excluded.total_fiber_grams, total_micronutrients_json=excluded.total_micronutrients_json,meal_count=excluded.meal_count,item_count=excluded.item_count,goal_calories_kcal=excluded.goal_calories_kcal,goal_protein_grams=excluded.goal_protein_grams,goal_carbohydrates_grams=excluded.goal_carbohydrates_grams,goal_fat_grams=excluded.goal_fat_grams,goal_fiber_grams=excluded.goal_fiber_grams,closed_at=excluded.closed_at,finalized=excluded.finalized,details_purged_at=excluded.details_purged_at,updated_at=excluded.updated_at', input.localDate, input.totalCaloriesKcal, input.totalProteinGrams, input.totalCarbohydratesGrams, input.totalFatGrams, input.totalFiberGrams, JSON.stringify(input.totalMicronutrients), input.mealCount, input.itemCount, input.goalCaloriesKcal, input.goalProteinGrams, input.goalCarbohydratesGrams, input.goalFatGrams, input.goalFiberGrams, input.closedAt, Number(input.finalized), input.detailsPurgedAt, now)
  return (await findSummary(database, input.localDate))!
}
async function currentGoals(database: SqlDatabase) { const row = await database.first<{ value_json: string }>('SELECT value_json FROM app_settings WHERE key=?', NUTRITION_GOALS_KEY); return goals(parse(row?.value_json, {}, 'metas nutricionais')) }

async function aggregateInTransaction(database: SqlDatabase, date: string, now: Date, finalize = false): Promise<DailyNutritionSummary | null> {
  const existing = await findSummary(database, date)
  if (existing?.finalized) return existing
  if (date >= localDateKey(now)) {
    if (!existing) return null
    await database.run('DELETE FROM nutrition_daily_summaries WHERE local_date=?', date)
    return null
  }
  const meals = await loadMeals(database, 'local_date=?', date)
  if (!meals.length) {
    if (existing?.finalized) return existing
    await database.run('DELETE FROM nutrition_daily_summaries WHERE local_date=?', date)
    return null
  }
  const activeGoals = existing && date < localDateKey(now)
    ? { caloriesKcal: existing.goalCaloriesKcal, proteinGrams: existing.goalProteinGrams, carbohydratesGrams: existing.goalCarbohydratesGrams, fatGrams: existing.goalFatGrams, fiberGrams: existing.goalFiberGrams }
    : await currentGoals(database)
  const aggregate = aggregateNutritionDay(meals, activeGoals, now)
  return upsertSummary(database, { ...aggregate!, finalized: finalize, detailsPurgedAt: existing?.detailsPurgedAt ?? null })
}

export function nutritionRepositories(database: SqlDatabase) {
  let queue = Promise.resolve()
  const serial = <T>(operation: () => Promise<T>) => { const result = queue.then(operation, operation); queue = result.then(() => undefined, () => undefined); return result }
  const aggregateDay = (date: string) => serial(() => database.transaction((tx) => aggregateInTransaction(tx, date, new Date())))
  const meals: NutritionMealRepository = {
    create: (input) => serial(() => database.transaction(async (tx) => { validateNutritionMealInput(input); await assertOpen(tx, input.localDate); const now = new Date().toISOString(); const id = (await tx.run('INSERT INTO nutrition_meals(local_date,consumed_at,meal_type,title,notes,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', input.localDate, input.consumedAt, input.mealType, input.title.trim(), input.notes.trim(), input.source, now, now)).lastInsertRowId; await insertItems(tx, id, input, now); await aggregateInTransaction(tx, input.localDate, new Date()); return (await loadMeals(tx, 'id=?', id))[0]! })),
    update: (id, input) => serial(() => database.transaction(async (tx) => { validateNutritionMealInput(input); const old = await tx.first<{ local_date: string }>('SELECT local_date FROM nutrition_meals WHERE id=?', id); if (!old) throw new Error('Refeição não encontrada.'); await assertOpen(tx, old.local_date); await assertOpen(tx, input.localDate); const now = new Date().toISOString(); await tx.run('UPDATE nutrition_meals SET local_date=?,consumed_at=?,meal_type=?,title=?,notes=?,source=?,updated_at=? WHERE id=?', input.localDate, input.consumedAt, input.mealType, input.title.trim(), input.notes.trim(), input.source, now, id); await tx.run('DELETE FROM nutrition_meal_items WHERE meal_id=?', id); await insertItems(tx, id, input, now); await aggregateInTransaction(tx, old.local_date, new Date()); if (old.local_date !== input.localDate) await aggregateInTransaction(tx, input.localDate, new Date()); return (await loadMeals(tx, 'id=?', id))[0]! })),
    delete: (id) => serial(() => database.transaction(async (tx) => { const row = await tx.first<{ local_date: string }>('SELECT local_date FROM nutrition_meals WHERE id=?', id); if (!row) return; await assertOpen(tx, row.local_date); await tx.run('DELETE FROM nutrition_meals WHERE id=?', id); await aggregateInTransaction(tx, row.local_date, new Date()) })),
    findById: (id) => serial(async () => (await loadMeals(database, 'id=?', id))[0] ?? null),
    listByDate: (date) => serial(() => loadMeals(database, 'local_date=?', date)),
    listBetweenDates: (start, end) => serial(() => loadMeals(database, 'local_date BETWEEN ? AND ?', start, end)),
  }
  const summaries: NutritionSummaryRepository = {
    findByDate: (date) => serial(() => findSummary(database, date)),
    listBetweenDates: (start, end) => serial(async () => (await database.all<Record<string, unknown>>('SELECT * FROM nutrition_daily_summaries WHERE local_date BETWEEN ? AND ? ORDER BY local_date DESC', start, end)).map(summaryFromRow)),
    upsert: (input) => serial(() => database.transaction((tx) => upsertSummary(tx, input))),
  }
  const closePendingDays = (tx: SqlDatabase, today: string) => tx.all<{ local_date: string }>('SELECT DISTINCT local_date FROM nutrition_meals WHERE local_date < ?', today).then(async (rows) => { for (const row of rows) await aggregateInTransaction(tx, row.local_date, new Date(`${today}T12:00:00`), true) })
  const purge = async (tx: SqlDatabase, today: string, retentionDays: number) => {
    const threshold = new Date(`${today}T12:00:00`); threshold.setDate(threshold.getDate() - retentionDays); const cutoff = localDateKey(threshold); const dates = await tx.all<{ local_date: string }>('SELECT DISTINCT local_date FROM nutrition_meals WHERE local_date < ?', cutoff); let removed = 0
    for (const row of dates) { const summary = await findSummary(tx, row.local_date); if (!summary?.finalized) continue; const result = await tx.run('DELETE FROM nutrition_meals WHERE local_date=?', row.local_date); removed += result.changes; if (result.changes) await tx.run('UPDATE nutrition_daily_summaries SET details_purged_at=?, updated_at=? WHERE local_date=?', new Date().toISOString(), new Date().toISOString(), row.local_date) }
    return removed
  }
  const maintenance: NutritionMaintenanceRepository = { aggregateDay, closePendingDays: (today) => serial(() => database.transaction((tx) => closePendingDays(tx, today))), purgeExpiredMealDetails: (today, retentionDays = 7) => serial(() => database.transaction((tx) => purge(tx, today, retentionDays))), run: (today) => serial(() => database.transaction(async (tx) => { await closePendingDays(tx, today); await purge(tx, today, 7) })) }
  return { meals, summaries, maintenance }
}

async function insertItems(database: SqlDatabase, mealId: number, input: NutritionMealInput, now: string) {
  if (!input.items.length) throw new Error('A refeição precisa de pelo menos um alimento.')
  for (const [sortOrder, item] of input.items.map(validateNutritionItem).entries()) await database.run('INSERT INTO nutrition_meal_items(meal_id,name,portion_description,estimated_grams,calories_kcal,protein_grams,carbohydrates_grams,fat_grams,fiber_grams,micronutrients_json,confidence,data_source,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', mealId, item.name, item.portionDescription, item.estimatedGrams, item.caloriesKcal, item.proteinGrams, item.carbohydratesGrams, item.fatGrams, item.fiberGrams, JSON.stringify(item.micronutrients), item.confidence, item.dataSource, sortOrder, now, now)
}

async function assertOpen(database: SqlDatabase, date: string) {
  validateNutritionDate(date)
  if (date !== localDateKey(new Date())) throw new Error('Somente o dia atual está aberto para edição.')
  const summary = await database.first<{ finalized: number }>('SELECT finalized FROM nutrition_daily_summaries WHERE local_date=?', date)
  if (summary?.finalized === 1) throw new Error('Este dia já foi fechado e não pode ser editado.')
}

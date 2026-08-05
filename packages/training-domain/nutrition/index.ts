export const MICRONUTRIENT_CODES = [
  'sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg',
  'vitamin_a_mcg_rae', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg', 'vitamin_k_mcg',
  'vitamin_b1_mg', 'vitamin_b2_mg', 'vitamin_b3_mg', 'vitamin_b6_mg', 'vitamin_b9_mcg', 'vitamin_b12_mcg',
] as const

export type MicronutrientCode = typeof MICRONUTRIENT_CODES[number]
export type MicronutrientTotals = Partial<Record<MicronutrientCode, number>>
export type NutritionMealType = 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER' | 'SUPPER' | 'OTHER'
export type NutritionMealSource = 'MANUAL' | 'CAMERA' | 'GALLERY' | 'BARCODE' | 'SAVED_MEAL'
export type NutritionDataSource = 'MANUAL' | 'LOCAL_DATABASE' | 'USDA' | 'OPEN_FOOD_FACTS' | 'AI_ESTIMATE'

export interface NutritionMealItem {
  id: number; mealId: number; name: string; portionDescription: string; estimatedGrams: number | null
  caloriesKcal: number; proteinGrams: number; carbohydratesGrams: number; fatGrams: number; fiberGrams: number
  micronutrients: MicronutrientTotals; confidence: number | null; dataSource: NutritionDataSource
  sortOrder: number; createdAt: string; updatedAt: string
}
export interface NutritionMeal {
  id: number; localDate: string; consumedAt: string; mealType: NutritionMealType; title: string; notes: string
  source: NutritionMealSource; createdAt: string; updatedAt: string; items: NutritionMealItem[]
}
export type NutritionMealItemInput = Omit<NutritionMealItem, 'id' | 'mealId' | 'createdAt' | 'updatedAt'>
export interface NutritionMealInput { localDate: string; consumedAt: string; mealType: NutritionMealType; title: string; notes: string; source: NutritionMealSource; items: NutritionMealItemInput[] }
export interface DailyNutritionSummary {
  id: number; localDate: string; totalCaloriesKcal: number; totalProteinGrams: number; totalCarbohydratesGrams: number
  totalFatGrams: number; totalFiberGrams: number; totalMicronutrients: MicronutrientTotals; mealCount: number; itemCount: number
  goalCaloriesKcal: number | null; goalProteinGrams: number | null; goalCarbohydratesGrams: number | null; goalFatGrams: number | null; goalFiberGrams: number | null
  closedAt: string; updatedAt: string
}
export type DailyNutritionSummaryInput = Omit<DailyNutritionSummary, 'id'> & { id?: number }
export interface NutritionGoals { caloriesKcal: number | null; proteinGrams: number | null; carbohydratesGrams: number | null; fatGrams: number | null; fiberGrams: number | null }
export interface NutritionMealRepository { create(input: NutritionMealInput): Promise<NutritionMeal>; update(id: number, input: NutritionMealInput): Promise<NutritionMeal>; delete(id: number): Promise<void>; findById(id: number): Promise<NutritionMeal | null>; listByDate(localDate: string): Promise<NutritionMeal[]>; listBetweenDates(startDate: string, endDate: string): Promise<NutritionMeal[]> }
export interface NutritionSummaryRepository { findByDate(localDate: string): Promise<DailyNutritionSummary | null>; listBetweenDates(startDate: string, endDate: string): Promise<DailyNutritionSummary[]>; upsert(summary: DailyNutritionSummaryInput): Promise<DailyNutritionSummary> }
export interface NutritionMaintenanceRepository { aggregateDay(localDate: string): Promise<DailyNutritionSummary | null>; closePendingDays(today: string): Promise<void>; purgeExpiredMealDetails(today: string, retentionDays?: number): Promise<number>; run(today: string): Promise<void> }

const NUTRIENT_FIELDS = ['caloriesKcal', 'proteinGrams', 'carbohydratesGrams', 'fatGrams', 'fiberGrams'] as const
const finiteNonNegative = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} deve ser um número não negativo.`)
  return value
}
export function validateNutritionItem(input: NutritionMealItemInput): NutritionMealItemInput {
  if (!input.name.trim()) throw new Error('Informe o nome do alimento.')
  for (const field of NUTRIENT_FIELDS) finiteNonNegative(input[field], field)
  if (input.estimatedGrams !== null) finiteNonNegative(input.estimatedGrams, 'Peso')
  if (input.confidence !== null && (typeof input.confidence !== 'number' || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1)) throw new Error('A confiança deve ficar entre 0 e 1.')
  return { ...input, name: input.name.trim(), portionDescription: input.portionDescription.trim(), micronutrients: normalizeMicronutrients(input.micronutrients) }
}
export function normalizeMicronutrients(value: MicronutrientTotals): MicronutrientTotals {
  const result: MicronutrientTotals = {}
  for (const code of MICRONUTRIENT_CODES) if (value[code] !== undefined) result[code] = finiteNonNegative(value[code], code)
  return result
}
export function aggregateNutritionDay(meals: NutritionMeal[], goals: NutritionGoals, now = new Date()): DailyNutritionSummaryInput | null {
  if (!meals.length) return null
  const totals = { caloriesKcal: 0, proteinGrams: 0, carbohydratesGrams: 0, fatGrams: 0, fiberGrams: 0 }
  const micronutrients: MicronutrientTotals = {}
  let itemCount = 0
  for (const meal of meals) for (const item of meal.items) {
    itemCount += 1
    totals.caloriesKcal += item.caloriesKcal; totals.proteinGrams += item.proteinGrams; totals.carbohydratesGrams += item.carbohydratesGrams; totals.fatGrams += item.fatGrams; totals.fiberGrams += item.fiberGrams
    for (const code of MICRONUTRIENT_CODES) if (item.micronutrients[code] !== undefined) micronutrients[code] = (micronutrients[code] ?? 0) + item.micronutrients[code]!
  }
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  return { localDate: meals[0]!.localDate, totalCaloriesKcal: round(totals.caloriesKcal), totalProteinGrams: round(totals.proteinGrams), totalCarbohydratesGrams: round(totals.carbohydratesGrams), totalFatGrams: round(totals.fatGrams), totalFiberGrams: round(totals.fiberGrams), totalMicronutrients: Object.fromEntries(Object.entries(micronutrients).map(([key, value]) => [key, round(value)])), mealCount: meals.length, itemCount, goalCaloriesKcal: goals.caloriesKcal, goalProteinGrams: goals.proteinGrams, goalCarbohydratesGrams: goals.carbohydratesGrams, goalFatGrams: goals.fatGrams, goalFiberGrams: goals.fiberGrams, closedAt: now.toISOString(), updatedAt: now.toISOString() }
}

export const MICRONUTRIENT_CODES = [
  'sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg',
  'vitamin_a_mcg_rae', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg', 'vitamin_k_mcg',
  'vitamin_b1_mg', 'vitamin_b2_mg', 'vitamin_b3_mg', 'vitamin_b6_mg', 'vitamin_b9_mcg', 'vitamin_b12_mcg',
] as const

export type MicronutrientCode = typeof MICRONUTRIENT_CODES[number]
export type MicronutrientTotals = Partial<Record<MicronutrientCode, number>>
export const MICRONUTRIENT_METADATA: Record<MicronutrientCode, { name: string; unit: string; category: 'mineral' | 'vitamin'; order: number }> = {
  sodium_mg: { name: 'Sódio', unit: 'mg', category: 'mineral', order: 1 }, potassium_mg: { name: 'Potássio', unit: 'mg', category: 'mineral', order: 2 }, calcium_mg: { name: 'Cálcio', unit: 'mg', category: 'mineral', order: 3 }, iron_mg: { name: 'Ferro', unit: 'mg', category: 'mineral', order: 4 }, magnesium_mg: { name: 'Magnésio', unit: 'mg', category: 'mineral', order: 5 }, zinc_mg: { name: 'Zinco', unit: 'mg', category: 'mineral', order: 6 }, vitamin_a_mcg_rae: { name: 'Vitamina A', unit: 'mcg RAE', category: 'vitamin', order: 7 }, vitamin_c_mg: { name: 'Vitamina C', unit: 'mg', category: 'vitamin', order: 8 }, vitamin_d_mcg: { name: 'Vitamina D', unit: 'mcg', category: 'vitamin', order: 9 }, vitamin_e_mg: { name: 'Vitamina E', unit: 'mg', category: 'vitamin', order: 10 }, vitamin_k_mcg: { name: 'Vitamina K', unit: 'mcg', category: 'vitamin', order: 11 }, vitamin_b1_mg: { name: 'Vitamina B1', unit: 'mg', category: 'vitamin', order: 12 }, vitamin_b2_mg: { name: 'Vitamina B2', unit: 'mg', category: 'vitamin', order: 13 }, vitamin_b3_mg: { name: 'Vitamina B3', unit: 'mg', category: 'vitamin', order: 14 }, vitamin_b6_mg: { name: 'Vitamina B6', unit: 'mg', category: 'vitamin', order: 15 }, vitamin_b9_mcg: { name: 'Vitamina B9', unit: 'mcg', category: 'vitamin', order: 16 }, vitamin_b12_mcg: { name: 'Vitamina B12', unit: 'mcg', category: 'vitamin', order: 17 },
}
export type NutritionMealType = 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER' | 'SUPPER' | 'OTHER'
export type NutritionMealSource = 'MANUAL' | 'CAMERA' | 'GALLERY' | 'BARCODE' | 'SAVED_MEAL'
export type NutritionDataSource = 'MANUAL' | 'LOCAL_DATABASE' | 'USDA' | 'OPEN_FOOD_FACTS' | 'AI_ESTIMATE'
const NUTRITION_MEAL_TYPES: NutritionMealType[] = ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER']
const NUTRITION_MEAL_SOURCES: NutritionMealSource[] = ['MANUAL', 'CAMERA', 'GALLERY', 'BARCODE', 'SAVED_MEAL']
const NUTRITION_DATA_SOURCES: NutritionDataSource[] = ['MANUAL', 'LOCAL_DATABASE', 'USDA', 'OPEN_FOOD_FACTS', 'AI_ESTIMATE']

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
  closedAt: string; finalized: boolean; detailsPurgedAt: string | null; updatedAt: string
}
export type DailyNutritionSummaryInput = Omit<DailyNutritionSummary, 'id'> & { id?: number }
export interface NutritionGoals { caloriesKcal: number | null; proteinGrams: number | null; carbohydratesGrams: number | null; fatGrams: number | null; fiberGrams: number | null }
export interface NutritionMealRepository { create(input: NutritionMealInput): Promise<NutritionMeal>; update(id: number, input: NutritionMealInput): Promise<NutritionMeal>; delete(id: number): Promise<void>; findById(id: number): Promise<NutritionMeal | null>; listByDate(localDate: string): Promise<NutritionMeal[]>; listBetweenDates(startDate: string, endDate: string): Promise<NutritionMeal[]> }
export interface NutritionSummaryRepository { findByDate(localDate: string): Promise<DailyNutritionSummary | null>; listBetweenDates(startDate: string, endDate: string): Promise<DailyNutritionSummary[]>; upsert(summary: DailyNutritionSummaryInput): Promise<DailyNutritionSummary> }
export interface NutritionMaintenanceRepository { aggregateDay(localDate: string): Promise<DailyNutritionSummary | null>; closePendingDays(today: string): Promise<void>; purgeExpiredMealDetails(today: string, retentionDays?: number): Promise<number>; run(today: string): Promise<void> }

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function validateNutritionDate(localDate: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error('A data da refeição é inválida.')
  const [year, month, day] = localDate.split('-').map(Number)
  const parsed = new Date(year!, month! - 1, day!)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month! - 1 || parsed.getDate() !== day) throw new Error('A data da refeição é inválida.')
  if (localDate > localDateKey(now)) throw new Error('Não é possível registrar refeições em uma data futura.')
  return localDate
}

export function isNutritionDateEditable(
  localDate: string,
  detailsPurgedAt: string | null | undefined,
  now = new Date(),
) {
  try { validateNutritionDate(localDate, now) } catch { return false }
  const firstEditable = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  firstEditable.setDate(firstEditable.getDate() - 7)
  return localDate >= localDateKey(firstEditable) && !detailsPurgedAt
}

export function validateNutritionMealInput(input: NutritionMealInput, now = new Date()): NutritionMealInput {
  validateNutritionDate(input.localDate, now)
  if (typeof input.consumedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input.consumedAt)) throw new Error('O horário da refeição é inválido.')
  const consumedAt = new Date(input.consumedAt)
  if (Number.isNaN(consumedAt.getTime())) throw new Error('O horário da refeição é inválido.')
  if (localDateKey(consumedAt) !== input.localDate) throw new Error('O horário da refeição não corresponde à data informada.')
  if (!NUTRITION_MEAL_TYPES.includes(input.mealType)) throw new Error('O tipo da refeição é inválido.')
  if (!NUTRITION_MEAL_SOURCES.includes(input.source)) throw new Error('A origem da refeição é inválida.')
  if (typeof input.title !== 'string' || typeof input.notes !== 'string') throw new Error('Os dados da refeição são inválidos.')
  if (!Array.isArray(input.items) || !input.items.length) throw new Error('A refeição precisa de pelo menos um alimento.')
  return { ...input, items: input.items.map(validateNutritionItem) }
}

export class NutritionDataError extends Error {
  constructor(message: string, public readonly cause?: unknown) { super(message); this.name = 'NutritionDataError' }
}

export const NUTRITION_GOAL_LIMITS = {
  caloriesKcal: 20_000,
  proteinGrams: 2_000,
  carbohydratesGrams: 3_000,
  fatGrams: 2_000,
  fiberGrams: 500,
} as const

export function validateNutritionGoals(input: NutritionGoals): NutritionGoals {
  for (const key of Object.keys(NUTRITION_GOAL_LIMITS) as Array<keyof NutritionGoals>) {
    const value = input[key]
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > NUTRITION_GOAL_LIMITS[key])) {
      throw new Error(`${key} deve ser vazio ou ficar entre 1 e ${NUTRITION_GOAL_LIMITS[key]}.`)
    }
  }
  return input
}

const NUTRIENT_FIELDS = ['caloriesKcal', 'proteinGrams', 'carbohydratesGrams', 'fatGrams', 'fiberGrams'] as const
const finiteNonNegative = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} deve ser um número não negativo.`)
  return value
}
export function validateNutritionItem(input: NutritionMealItemInput): NutritionMealItemInput {
  if (!input || typeof input !== 'object' || typeof input.name !== 'string' || !input.name.trim()) throw new Error('Informe o nome do alimento.')
  if (typeof input.portionDescription !== 'string') throw new Error('A porção do alimento é inválida.')
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new Error('A ordem do alimento é inválida.')
  if (!NUTRITION_DATA_SOURCES.includes(input.dataSource)) throw new Error('A origem dos dados do alimento é inválida.')
  for (const field of NUTRIENT_FIELDS) finiteNonNegative(input[field], field)
  if (input.estimatedGrams !== null) finiteNonNegative(input.estimatedGrams, 'Peso')
  if (input.confidence !== null && (typeof input.confidence !== 'number' || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1)) throw new Error('A confiança deve ficar entre 0 e 1.')
  return { ...input, name: input.name.trim(), portionDescription: input.portionDescription.trim(), micronutrients: normalizeMicronutrients(input.micronutrients) }
}
export function normalizeMicronutrients(value: MicronutrientTotals): MicronutrientTotals {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Os micronutrientes são inválidos.')
  const result: MicronutrientTotals = {}
  for (const [code, amount] of Object.entries(value)) {
    if (!MICRONUTRIENT_CODES.includes(code as MicronutrientCode)) throw new Error(`Micronutriente inválido: ${code}.`)
    result[code as MicronutrientCode] = finiteNonNegative(amount, code)
  }
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
  return { localDate: meals[0]!.localDate, totalCaloriesKcal: round(totals.caloriesKcal), totalProteinGrams: round(totals.proteinGrams), totalCarbohydratesGrams: round(totals.carbohydratesGrams), totalFatGrams: round(totals.fatGrams), totalFiberGrams: round(totals.fiberGrams), totalMicronutrients: Object.fromEntries(Object.entries(micronutrients).map(([key, value]) => [key, round(value)])), mealCount: meals.length, itemCount, goalCaloriesKcal: goals.caloriesKcal, goalProteinGrams: goals.proteinGrams, goalCarbohydratesGrams: goals.carbohydratesGrams, goalFatGrams: goals.fatGrams, goalFiberGrams: goals.fiberGrams, closedAt: now.toISOString(), finalized: false, detailsPurgedAt: null, updatedAt: now.toISOString() }
}

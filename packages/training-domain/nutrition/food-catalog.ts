import type { MicronutrientTotals, NutritionMealType } from './index'

export type FoodSource = 'LOCAL' | 'TBCA' | 'OPEN_FOOD_FACTS' | 'USDA' | 'USER'
export type FoodUnit = 'g' | 'ml' | 'unit'

export interface FoodNutrients {
  energyKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  micronutrients: MicronutrientTotals
}

export interface FoodAttribution {
  sourceName: string
  sourceUrl?: string
  license?: string
}

export interface CanonicalFood {
  /** Stable local identifier. External entries use a source-qualified value. */
  id: string
  source: FoodSource
  externalId: string | null
  name: string
  normalizedName: string
  brand: string | null
  servingBasis: { amount: number; unit: FoodUnit }
  nutrients: FoodNutrients
  barcode: string | null
  attribution: FoodAttribution | null
  dataQuality: { completeness: number; verified: boolean } | null
}

export interface FoodSearchQuery {
  text: string
  page?: number
  pageSize?: number
}

export interface FoodSearchResult {
  items: CanonicalFood[]
  page: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface FoodCatalogProvider {
  readonly id: FoodSource
  search(query: FoodSearchQuery): Promise<FoodSearchResult>
  getById(externalId: string): Promise<CanonicalFood | null>
  getByBarcode?(barcode: string): Promise<CanonicalFood | null>
}

export function foodIdentity(food: Pick<CanonicalFood, 'id' | 'source' | 'externalId'>) {
  return `${food.source}:${food.externalId ?? food.id}`
}

export function normalizeFoodName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ')
}

export class LocalFoodCatalogProvider implements FoodCatalogProvider {
  readonly id = 'LOCAL' as const
  private readonly foods: readonly CanonicalFood[]

  constructor(foods: readonly CanonicalFood[]) {
    this.foods = foods.map(validateCanonicalFood)
  }

  async search(query: FoodSearchQuery): Promise<FoodSearchResult> {
    const page = Math.max(1, Math.floor(query.page ?? 1))
    const pageSize = Math.min(50, Math.max(1, Math.floor(query.pageSize ?? 20)))
    const text = normalizeFoodName(query.text)
    const matches = this.foods.filter((food) => !text || food.normalizedName.includes(text) || normalizeFoodName(food.brand ?? '').includes(text))
    const start = (page - 1) * pageSize
    return {
      items: matches.slice(start, start + pageSize),
      page,
      pageSize,
      total: matches.length,
      hasNext: start + pageSize < matches.length,
      hasPrevious: page > 1,
    }
  }

  async getById(externalId: string) {
    return this.foods.find((food) => food.externalId === externalId || food.id === externalId) ?? null
  }

  async getByBarcode(barcode: string) {
    return this.foods.find((food) => food.barcode === barcode) ?? null
  }
}

export type FoodResolutionStatus = 'exact' | 'probable' | 'ambiguous' | 'notFound'
export interface FoodResolutionResult {
  status: FoodResolutionStatus
  candidates: CanonicalFood[]
}

export class FoodResolver {
  constructor(private readonly providers: readonly FoodCatalogProvider[]) {}

  async resolve(query: FoodSearchQuery): Promise<FoodResolutionResult> {
    const results = await Promise.all(this.providers.map((provider) => provider.search({ ...query, page: 1 })))
    const candidates = deduplicateFoods(results.flatMap((result) => result.items))
    if (!candidates.length) return { status: 'notFound', candidates }
    const exact = candidates.filter((food) => food.normalizedName === normalizeFoodName(query.text))
    if (exact.length === 1) return { status: 'exact', candidates: exact }
    if (candidates.length === 1) return { status: 'probable', candidates }
    return { status: 'ambiguous', candidates }
  }
}

export interface FoodPortion { amount: number; unit: FoodUnit }
export interface ResolvedFoodPortion {
  food: CanonicalFood
  portion: FoodPortion
  nutrients: FoodNutrients
}

export interface MealDraftItem {
  portion: ResolvedFoodPortion
  portionDescription: string
}

export interface MealDraft {
  localDate: string
  consumedAt: string
  mealType: NutritionMealType
  title: string
  notes: string
  items: MealDraftItem[]
}

/** Calculates with full floating-point precision; rounding belongs only to presentation. */
export function calculateFoodPortion(food: CanonicalFood, portion: FoodPortion): ResolvedFoodPortion {
  validatePortion(portion)
  if (portion.unit !== food.servingBasis.unit) throw new Error(`A porção deve usar ${food.servingBasis.unit}.`)
  const factor = portion.amount / food.servingBasis.amount
  return {
    food,
    portion,
    nutrients: {
      energyKcal: food.nutrients.energyKcal * factor,
      proteinG: food.nutrients.proteinG * factor,
      carbsG: food.nutrients.carbsG * factor,
      fatG: food.nutrients.fatG * factor,
      fiberG: food.nutrients.fiberG * factor,
      micronutrients: Object.fromEntries(Object.entries(food.nutrients.micronutrients).map(([code, value]) => [code, value! * factor])) as MicronutrientTotals,
    },
  }
}

/** Deterministic nutrient calculation boundary for catalog portions. */
export class NutritionCalculator {
  static calculatePortion(food: CanonicalFood, portion: FoodPortion) {
    return calculateFoodPortion(food, portion)
  }
}

export const LOCAL_FOOD_CATALOG: readonly CanonicalFood[] = [
  localFood('rice-cooked', 'Arroz cozido', { energyKcal: 128, proteinG: 2.5, carbsG: 28.1, fatG: 0.2, fiberG: 1.6 }),
  localFood('beans-cooked', 'Feijão cozido', { energyKcal: 76, proteinG: 4.8, carbsG: 13.6, fatG: 0.5, fiberG: 8.5 }),
  localFood('chicken-grilled', 'Frango grelhado', { energyKcal: 159, proteinG: 32, carbsG: 0, fatG: 2.5, fiberG: 0 }),
]

function localFood(externalId: string, name: string, nutrients: Omit<FoodNutrients, 'micronutrients'>): CanonicalFood {
  return {
    id: `LOCAL:${externalId}`,
    source: 'LOCAL',
    externalId,
    name,
    normalizedName: normalizeFoodName(name),
    brand: null,
    servingBasis: { amount: 100, unit: 'g' },
    nutrients: { ...nutrients, micronutrients: {} },
    barcode: null,
    attribution: { sourceName: 'Training App local development fixture' },
    dataQuality: { completeness: 0, verified: false },
  }
}

function validateCanonicalFood(food: CanonicalFood): CanonicalFood {
  if (!food.id || !food.name.trim() || !food.externalId || food.source !== 'LOCAL') throw new Error('Alimento local inválido.')
  validatePortion(food.servingBasis)
  const nutrients = food.nutrients
  for (const value of [nutrients.energyKcal, nutrients.proteinG, nutrients.carbsG, nutrients.fatG, nutrients.fiberG, ...Object.values(nutrients.micronutrients)]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Nutrientes do alimento devem ser números não negativos.')
  }
  return { ...food, normalizedName: normalizeFoodName(food.name) }
}

function validatePortion(portion: FoodPortion) {
  if (!Number.isFinite(portion.amount) || portion.amount <= 0) throw new Error('A quantidade deve ser positiva.')
  if (!['g', 'ml', 'unit'].includes(portion.unit)) throw new Error('A unidade do alimento é inválida.')
}

function deduplicateFoods(foods: readonly CanonicalFood[]) {
  return [...new Map(foods.map((food) => [foodIdentity(food), food])).values()]
}

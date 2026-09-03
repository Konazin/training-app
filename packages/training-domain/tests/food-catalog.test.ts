import { describe, expect, it } from 'vitest'
import {
  calculateFoodPortion,
  FoodResolver,
  LOCAL_FOOD_CATALOG,
  LocalFoodCatalogProvider,
  NutritionCalculator,
  type CanonicalFood,
  type FoodCatalogProvider,
  type FoodSearchQuery,
} from '..'

const local = new LocalFoodCatalogProvider(LOCAL_FOOD_CATALOG)

describe('food catalog', () => {
  it('searches case- and accent-insensitively with pagination', async () => {
    expect((await local.search({ text: 'arroz' })).items.map((food) => food.externalId)).toEqual(['rice-cooked'])
    expect((await local.search({ text: 'ARROZ' })).items).toHaveLength(1)
    expect((await local.search({ text: 'feijao' })).items.map((food) => food.name)).toEqual(['Feijão cozido'])
    expect((await local.search({ text: 'inexistente' })).items).toEqual([])
    const page = await local.search({ text: '', page: 2, pageSize: 2 })
    expect(page.items.map((food) => food.externalId)).toEqual(['chicken-grilled'])
    expect(page.hasPrevious).toBe(true)
  })

  it('keeps source-qualified identities distinct', async () => {
    const tbca = externalFood('TBCA', '123', 'Arroz TBCA')
    const usda = externalFood('USDA', '123', 'Rice USDA')
    const resolver = new FoodResolver([provider('TBCA', [tbca]), provider('USDA', [usda])])
    const result = await resolver.resolve({ text: 'arroz' })
    expect(result.status).toBe('ambiguous')
    expect(result.candidates.map((food) => `${food.source}:${food.externalId}`)).toEqual(['TBCA:123', 'USDA:123'])
    expect(new Set([`${tbca.source}:${tbca.externalId}`, `${usda.source}:${usda.externalId}`]).size).toBe(2)
  })

  it('calculates portions without intermediate rounding', () => {
    const food = {
      ...LOCAL_FOOD_CATALOG[0]!,
      nutrients: { energyKcal: 200, proteinG: 10, carbsG: 20, fatG: 5, fiberG: 2, micronutrients: { iron_mg: 1.5 } },
    }
    const portion = calculateFoodPortion(food, { amount: 150, unit: 'g' })
    expect(portion.nutrients).toMatchObject({ energyKcal: 300, proteinG: 15, carbsG: 30, fatG: 7.5, fiberG: 3, micronutrients: { iron_mg: 2.25 } })
    food.nutrients.energyKcal = 400
    expect(portion.nutrients.energyKcal).toBe(300)
    expect(NutritionCalculator.calculatePortion(food, { amount: 100, unit: 'g' }).nutrients.proteinG).toBe(10)
    expect(() => calculateFoodPortion(food, { amount: 150, unit: 'ml' })).toThrow('porção')
  })

  it('does not choose ambiguous matches silently', async () => {
    const first = externalFood('TBCA', 'rice-a', 'Arroz integral')
    const second = externalFood('USDA', 'rice-b', 'Arroz branco')
    const result = await new FoodResolver([provider('TBCA', [first]), provider('USDA', [second])]).resolve({ text: 'arroz' })
    expect(result.status).toBe('ambiguous')
    expect(result.candidates).toHaveLength(2)
  })
})

function provider(id: FoodCatalogProvider['id'], foods: CanonicalFood[]): FoodCatalogProvider {
  return {
    id,
    search: async (_query: FoodSearchQuery) => ({ items: foods, page: 1, pageSize: 20, total: foods.length, hasNext: false, hasPrevious: false }),
    getById: async (externalId) => foods.find((food) => food.externalId === externalId) ?? null,
  }
}

function externalFood(source: 'TBCA' | 'USDA', externalId: string, name: string): CanonicalFood {
  return {
    id: `${source}:${externalId}`,
    source,
    externalId,
    name,
    normalizedName: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    brand: null,
    servingBasis: { amount: 100, unit: 'g' },
    nutrients: { energyKcal: 1, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, micronutrients: {} },
    barcode: null,
    attribution: { sourceName: source },
    dataQuality: null,
  }
}

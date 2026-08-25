import { describe, expect, it } from 'vitest'
import { aggregateNutritionDay, normalizeMicronutrients, validateNutritionGoals, validateNutritionItem, validateNutritionMealInput, type NutritionMeal } from '..'

const item = (value = 10) => ({ name: 'Arroz', portionDescription: '1 porção', estimatedGrams: null, caloriesKcal: value, proteinGrams: 2, carbohydratesGrams: 3, fatGrams: 0, fiberGrams: 1, micronutrients: { vitamin_c_mg: 4 }, confidence: null, dataSource: 'MANUAL' as const, sortOrder: 0 })
const meal = (date: string, value = 10): NutritionMeal => ({ id: 1, localDate: date, consumedAt: `${date}T12:00:00.000Z`, mealType: 'LUNCH', title: 'Almoço', notes: '', source: 'MANUAL', createdAt: '', updatedAt: '', items: [{ ...item(value), id: 1, mealId: 1, createdAt: '', updatedAt: '' }] })

describe('nutrition', () => {
  it('rejects invalid numbers but accepts zero', () => {
    expect(() => validateNutritionItem(item(-1))).toThrow()
    expect(() => validateNutritionItem({ ...item(), caloriesKcal: Number.NaN })).toThrow()
    expect(validateNutritionItem({ ...item(), caloriesKcal: 0 }).caloriesKcal).toBe(0)
    expect(() => validateNutritionItem({ ...item(), confidence: 2 })).toThrow()
    expect(() => validateNutritionItem({ ...item(), micronutrients: { unknown: 1 } as never })).toThrow('Micronutriente')
  })
  it('aggregates items and keeps dates separate', () => {
    const result = aggregateNutritionDay([meal('2026-08-04', 10), { ...meal('2026-08-04', 5), id: 2 }], { caloriesKcal: 100, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })
    expect(result?.totalCaloriesKcal).toBe(15)
    expect(result?.totalMicronutrients.vitamin_c_mg).toBe(8)
    expect(result?.mealCount).toBe(2)
    expect(aggregateNutritionDay([], { caloriesKcal: null, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })).toBeNull()
  })
  it('validates defensive goal limits', () => {
    expect(validateNutritionGoals({ caloriesKcal: null, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })).toEqual({ caloriesKcal: null, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })
    expect(() => validateNutritionGoals({ caloriesKcal: 20_001, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })).toThrow()
    expect(() => validateNutritionGoals({ caloriesKcal: Number.NaN, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null })).toThrow()
  })
  it('validates complete manual meals at the domain boundary', () => {
    const input = { localDate: '2026-08-04', consumedAt: '2026-08-04T12:00:00.000Z', mealType: 'LUNCH' as const, title: '', notes: '', source: 'MANUAL' as const, items: [item()] }
    expect(validateNutritionMealInput(input, new Date('2026-08-04T18:00:00.000Z')).items).toHaveLength(1)
    expect(() => validateNutritionMealInput({ ...input, items: [] }, new Date('2026-08-04T18:00:00.000Z'))).toThrow('pelo menos um')
    expect(() => validateNutritionMealInput({ ...input, consumedAt: 'inválido' }, new Date('2026-08-04T18:00:00.000Z'))).toThrow('horário')
    expect(normalizeMicronutrients({ vitamin_c_mg: 1 })).toEqual({ vitamin_c_mg: 1 })
  })
})

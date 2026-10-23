import { describe, expect, it } from 'vitest'
import {
  addFavoriteMeal, adjustHydration, favoriteToMealInput, formatLiters,
  readFavoriteMeals, readHydration, removeFavoriteMeal,
} from './nutritionExtras'

const meal = (title: string) => ({
  id: 1, localDate: '2026-07-01', consumedAt: '', mealType: 'LUNCH', title, notes: '', source: 'MANUAL',
  createdAt: '', updatedAt: '',
  items: [{ id: 2, mealId: 1, name: 'Arroz', portionDescription: '', estimatedGrams: 100, caloriesKcal: 130,
    proteinGrams: 2, carbohydratesGrams: 28, fatGrams: 0, fiberGrams: 0, micronutrients: {}, confidence: null,
    dataSource: 'MANUAL', sortOrder: 0, createdAt: '', updatedAt: '' }],
}) as never

describe('refeições favoritas', () => {
  it('substitui duplicadas, remove ids e valida leitura', () => {
    let list = addFavoriteMeal([], meal('Almoço'), 'a')
    list = addFavoriteMeal(list, meal(' almoço '), 'b')
    expect(list.map((item) => item.id)).toEqual(['b'])
    expect(list[0]!.items[0]).not.toHaveProperty('id')
    expect(readFavoriteMeals([{ id: 1 }, ...list])).toHaveLength(1)
    expect(removeFavoriteMeal(list, 'b')).toEqual([])
  })
  it('gera uma refeição para o dia escolhido', () => {
    const input = favoriteToMealInput(addFavoriteMeal([], meal('Almoço'))[0]!, '2026-07-05')
    expect(input).toMatchObject({ localDate: '2026-07-05', source: 'SAVED_MEAL', title: 'Almoço' })
  })
})

describe('hidratação', () => {
  it('soma, não fica negativa e remove o dia zerado', () => {
    let log = adjustHydration({}, '2026-07-01', 300)
    log = adjustHydration(log, '2026-07-01', 200)
    expect(log['2026-07-01']).toBe(500)
    expect(adjustHydration(log, '2026-07-01', -900)).toEqual({})
  })
  it('descarta entradas inválidas e formata litros', () => {
    expect(readHydration({ '2026-07-01': 250, ruim: 5, '2026-07-02': -1 })).toEqual({ '2026-07-01': 250 })
    expect(formatLiters(1250)).toBe('1,25 L')
    expect(formatLiters(300)).toBe('300 mL')
  })
})

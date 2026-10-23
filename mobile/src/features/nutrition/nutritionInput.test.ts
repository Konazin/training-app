import { describe, expect, it } from 'vitest'
import { cloneMealInput, consumedAtForDate, consumedAtFromTime, formatNumberInput, parseNumberInput, parseTimeInput, timeOfDay } from './nutritionInput'

describe('entrada numérica da nutrição', () => {
  it('aceita ponto ou vírgula e preserva texto parcial como número válido', () => {
    expect(parseNumberInput('1,5', 0)).toBe(1.5)
    expect(parseNumberInput('1.', 0)).toBe(1)
    expect(parseNumberInput('  ', 0)).toBe(0)
    expect(parseNumberInput('', null)).toBeNull()
    expect(Number.isNaN(parseNumberInput('1.2.3', 0))).toBe(true)
  })
  it('formata null como vazio', () => {
    expect(formatNumberInput(null)).toBe('')
    expect(formatNumberInput(0)).toBe('0')
  })
})

describe('consumedAtForDate', () => {
  it('usa o instante atual no dia de hoje', () => {
    const now = new Date(2026, 9, 22, 8, 30)
    expect(consumedAtForDate('2026-10-22', now)).toBe(now.toISOString())
  })
  it('usa meio-dia local em outros dias', () => {
    const iso = consumedAtForDate('2026-10-20', new Date(2026, 9, 22, 8, 30))
    const d = new Date(iso)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 20, 12])
  })
})

describe('horário da refeição', () => {
  it('aceita formatos comuns e rejeita horas inválidas', () => {
    expect(parseTimeInput('7:05')).toBe('07:05')
    expect(parseTimeInput('07:05')).toBe('07:05')
    expect(parseTimeInput('19h30')).toBe('19:30')
    expect(parseTimeInput('24:00')).toBeNull()
    expect(parseTimeInput('12:60')).toBeNull()
    expect(parseTimeInput('abc')).toBeNull()
  })
  it('combina dia e horário local sem mudar de dia', () => {
    const iso = consumedAtFromTime('2026-10-20', '19:30')
    expect(timeOfDay(iso)).toBe('19:30')
    const date = new Date(iso)
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 20])
  })
})

describe('cloneMealInput', () => {
  it('copia itens sem ids e não compartilha micronutrientes', () => {
    const meal = {
      id: 9, localDate: '2026-07-01', consumedAt: '2026-07-01T12:00:00.000Z', mealType: 'LUNCH',
      title: 'Almoço', notes: '', source: 'MANUAL', createdAt: '', updatedAt: '',
      items: [{ id: 3, mealId: 9, name: 'Arroz', portionDescription: '', estimatedGrams: 100,
        caloriesKcal: 130, proteinGrams: 2, carbohydratesGrams: 28, fatGrams: 0, fiberGrams: 0,
        micronutrients: { sodium_mg: 1 }, confidence: null, dataSource: 'MANUAL', sortOrder: 0,
        createdAt: '', updatedAt: '' }],
    } as never
    const copy = cloneMealInput(meal, '2026-07-02', '2026-07-02T12:00:00.000Z')
    expect(copy.localDate).toBe('2026-07-02')
    expect(copy.items[0]).not.toHaveProperty('id')
    expect(copy.items[0]).toMatchObject({ name: 'Arroz', caloriesKcal: 130 })
  })
})

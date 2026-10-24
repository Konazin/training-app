import { localDateKey, type NutritionMeal, type NutritionMealInput } from '@training/training-domain'

/** Parses user-typed decimals ("1,5" or "1.5"). Empty text yields `emptyValue`; invalid text yields NaN. */
export function parseNumberInput<T extends number | null>(text: string, emptyValue: T): number | T {
  const trimmed = text.trim()
  if (!trimmed) return emptyValue
  return Number(trimmed.replace(',', '.'))
}

export function formatNumberInput(value: number | null) {
  return value === null ? '' : String(value)
}

/** Current time for today's meals; midday for other days so the list never shows an invented clock time. */
export function consumedAtForDate(date: string, now = new Date()) {
  if (date === localDateKey(now)) return now.toISOString()
  return new Date(`${date}T12:00:00`).toISOString()
}

/** "7:05", "07:05" ou "7h05" -> "07:05"; texto inválido -> null. */
export function parseTimeInput(text: string) {
  const match = /^\s*(\d{1,2})\s*[:hH]\s*(\d{2})\s*$/.exec(text)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function timeOfDay(isoString: string) {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Combina o dia da refeição com um horário local "HH:MM" e devolve ISO. */
export function consumedAtFromTime(localDate: string, time: string) {
  return new Date(`${localDate}T${time}:00`).toISOString()
}

/** Cópia editável de uma refeição para outro dia/horário; mantém itens, ignora ids. */
export function cloneMealInput(meal: NutritionMeal, localDate: string, consumedAt: string): NutritionMealInput {
  return {
    localDate,
    consumedAt,
    mealType: meal.mealType,
    title: meal.title,
    notes: meal.notes,
    source: meal.source,
    items: meal.items.map(({ id: _id, mealId: _mealId, createdAt: _c, updatedAt: _u, ...item }) => ({
      ...item,
      micronutrients: { ...item.micronutrients },
    })),
  }
}

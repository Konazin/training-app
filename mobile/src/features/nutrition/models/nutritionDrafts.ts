import { localDateKey, type MicronutrientTotals, type NutritionMeal, type NutritionMealInput, type NutritionMealType } from '@training/training-domain'

export interface NutritionMealItemDraft {
  name: string; portionDescription: string; estimatedGrams: string; caloriesKcal: string; proteinGrams: string
  carbohydratesGrams: string; fatGrams: string; fiberGrams: string; micronutrients: Record<string, string>
}
export interface NutritionMealDraft { localDate: string; time: string; mealType: NutritionMealType; title: string; notes: string; items: NutritionMealItemDraft[] }
export const createEmptyNutritionMealDraft = (date = localDateKey(new Date())): NutritionMealDraft => ({ localDate: date, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), mealType: 'OTHER', title: '', notes: '', items: [createEmptyNutritionMealItemDraft()] })
export const createEmptyNutritionMealItemDraft = (): NutritionMealItemDraft => ({ name: '', portionDescription: '', estimatedGrams: '', caloriesKcal: '', proteinGrams: '', carbohydratesGrams: '', fatGrams: '', fiberGrams: '', micronutrients: {} })
export function mealToDraft(meal: NutritionMeal): NutritionMealDraft { return { localDate: meal.localDate, time: new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), mealType: meal.mealType, title: meal.title, notes: meal.notes, items: meal.items.map((item) => ({ name: item.name, portionDescription: item.portionDescription, estimatedGrams: text(item.estimatedGrams), caloriesKcal: text(item.caloriesKcal), proteinGrams: text(item.proteinGrams), carbohydratesGrams: text(item.carbohydratesGrams), fatGrams: text(item.fatGrams), fiberGrams: text(item.fiberGrams), micronutrients: Object.fromEntries(Object.entries(item.micronutrients).map(([key, value]) => [key, text(value)])) })) } }
export function draftToInput(draft: NutritionMealDraft): NutritionMealInput {
  return { localDate: draft.localDate, consumedAt: combineLocalDateAndTime(draft.localDate, draft.time), mealType: draft.mealType, title: draft.title, notes: draft.notes, source: 'MANUAL', items: draft.items.map((item, sortOrder) => ({ name: item.name, portionDescription: item.portionDescription, estimatedGrams: numberOrNull(item.estimatedGrams), caloriesKcal: requiredNumber(item.caloriesKcal, 'calorias'), proteinGrams: requiredNumber(item.proteinGrams, 'proteína'), carbohydratesGrams: requiredNumber(item.carbohydratesGrams, 'carboidratos'), fatGrams: requiredNumber(item.fatGrams, 'gordura'), fiberGrams: requiredNumber(item.fiberGrams, 'fibra'), micronutrients: Object.fromEntries(Object.entries(item.micronutrients).filter(([, value]) => value.trim()).map(([key, value]) => [key, numberOrNull(value)])) as MicronutrientTotals, confidence: null, dataSource: 'MANUAL', sortOrder })) }
}
export function combineLocalDateAndTime(date: string, time: string): string {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Informe um horário válido no formato HH:MM.')
  const result = new Date(`${date}T${time}:00`)
  if (Number.isNaN(result.getTime())) throw new Error('A data da refeição é inválida.')
  return result.toISOString()
}
const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value.replace(',', '.'))
const requiredNumber = (value: string, label: string) => { const result = numberOrNull(value); if (result === null || !Number.isFinite(result)) throw new Error(`Informe um valor válido para ${label}.`); return result }
const text = (value: number | null | undefined) => value == null ? '' : String(value)

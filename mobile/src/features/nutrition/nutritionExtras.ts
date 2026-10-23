import type { NutritionMeal, NutritionMealInput, NutritionMealItemInput } from '@training/training-domain'
import { consumedAtForDate } from './nutritionInput'

export const FAVORITE_MEALS_KEY = 'nutrition.favorite-meals'
export const HYDRATION_KEY = 'nutrition.hydration'
const MAX_FAVORITES = 30
const HYDRATION_DAYS = 60
const MAX_ML_PER_DAY = 20000

export interface FavoriteMeal {
  id: string
  title: string
  mealType: NutritionMeal['mealType']
  notes: string
  items: NutritionMealItemInput[]
}

export function readFavoriteMeals(value: unknown): FavoriteMeal[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is FavoriteMeal => {
      if (!entry || typeof entry !== 'object') return false
      const candidate = entry as Record<string, unknown>
      return typeof candidate.id === 'string'
        && typeof candidate.title === 'string'
        && typeof candidate.mealType === 'string'
        && Array.isArray(candidate.items)
        && candidate.items.length > 0
    })
    .slice(0, MAX_FAVORITES)
}

const favoriteKey = (title: string, mealType: string) => `${mealType}:${title.trim().toLocaleLowerCase('pt-BR')}`

/** Favorita uma refeição; uma com mesmo tipo e título substitui a anterior. Os mais novos vêm primeiro. */
export function addFavoriteMeal(list: readonly FavoriteMeal[], meal: NutritionMeal, id = String(Date.now())): FavoriteMeal[] {
  const entry: FavoriteMeal = {
    id,
    title: meal.title.trim() || 'Refeição favorita',
    mealType: meal.mealType,
    notes: meal.notes,
    items: meal.items.map(({ id: _i, mealId: _m, createdAt: _c, updatedAt: _u, ...item }) => ({
      ...item,
      micronutrients: { ...item.micronutrients },
    })),
  }
  const rest = list.filter((item) => favoriteKey(item.title, item.mealType) !== favoriteKey(entry.title, entry.mealType))
  return [entry, ...rest].slice(0, MAX_FAVORITES)
}

export function removeFavoriteMeal(list: readonly FavoriteMeal[], id: string) {
  return list.filter((item) => item.id !== id)
}

export function favoriteToMealInput(favorite: FavoriteMeal, localDate: string, now = new Date()): NutritionMealInput {
  return {
    localDate,
    consumedAt: consumedAtForDate(localDate, now),
    mealType: favorite.mealType,
    title: favorite.title,
    notes: favorite.notes,
    source: 'SAVED_MEAL',
    items: favorite.items.map((item) => ({ ...item, micronutrients: { ...item.micronutrients } })),
  }
}

export type HydrationLog = Record<string, number>

export function readHydration(value: unknown): HydrationLog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const log: HydrationLog = {}
  for (const [date, ml] of Object.entries(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof ml === 'number' && Number.isFinite(ml) && ml > 0) {
      log[date] = Math.min(ml, MAX_ML_PER_DAY)
    }
  }
  return log
}

/** Soma (ou subtrai, sem passar de zero) água do dia e descarta dias com mais de 60 dias. */
export function adjustHydration(log: HydrationLog, date: string, deltaMl: number): HydrationLog {
  const next = Math.min(MAX_ML_PER_DAY, Math.max(0, Math.round((log[date] ?? 0) + deltaMl)))
  const kept = Object.keys(log).sort().slice(-HYDRATION_DAYS)
  const result: HydrationLog = {}
  for (const key of kept) if (key !== date) result[key] = log[key]!
  if (next > 0) result[date] = next
  return result
}

export function formatLiters(ml: number) {
  return ml >= 1000
    ? `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
    : `${ml} mL`
}

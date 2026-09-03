import type { FoodQueryDraft, FoodUnit, NutritionGoals } from './nutrition'
import type { PhysicalLimitation, UserGoal, UserProfile } from './user-profile'

/** Contracts deliberately contain proposals only. They never contain calculated nutrients or persistence commands. */
export interface MealParseDraft { items: FoodQueryDraft[] }
export interface FoodImageDraftItem extends FoodQueryDraft { confidence: number; estimated: boolean }
export interface FoodImageDraft { items: FoodImageDraftItem[]; uncertainties: string[] }
export interface DietPlanDraftItem extends FoodQueryDraft { mealName: string; notes: string | null }
export interface DietPlanDraft { meals: Array<{ name: string; items: DietPlanDraftItem[] }>; incompatibilities: string[] }
export interface TrainingPlanDraftExercise { exerciseId: string; sets: number; repetitions: string; restSeconds: number | null; notes: string | null }
export interface TrainingPlanDraft { days: Array<{ name: string; exercises: TrainingPlanDraftExercise[] }>; incompatibilities: string[] }

export interface AiImageInput { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string; userHint?: string }
export interface AiProvider {
  parseMeal(input: { text: string; context: MealParseContext }): Promise<MealParseDraft>
  analyzeMealImage(input: { image: AiImageInput; context: MealVisionContext }): Promise<FoodImageDraft>
  generateDiet(input: { context: DietPlanningContext }): Promise<DietPlanDraft>
  generateTrainingPlan(input: { context: TrainingPlanningContext }): Promise<TrainingPlanDraft>
}

export type AiTask = 'meal-parse' | 'meal-vision' | 'diet-plan' | 'training-plan'
export type AiErrorCode = 'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'UNAUTHORIZED' | 'UPSTREAM_FAILURE' | 'INVALID_RESPONSE' | 'INVALID_IMAGE'
export class AiProviderError extends Error {
  constructor(public readonly code: AiErrorCode, message: string) { super(message); this.name = 'AiProviderError' }
}

export interface MealParseContext { locale: 'pt-BR'; foodPreferences: string[]; avoidedFoods: string[]; allergies: string[]; dietaryRestrictions: string[] }
export interface MealVisionContext extends MealParseContext { userHint: string | null }
export interface DietPlanningContext {
  locale: 'pt-BR'
  goals: NutritionGoals
  mealsPerDay: number | null
  foodPreferences: string[]
  avoidedFoods: string[]
  allergies: string[]
  dietaryRestrictions: string[]
  weeklyFoodBudget: number | null
  cookingTimeMinutes: number | null
  cookingSkill: UserProfile['cookingSkill']
  practicalDifficulties: UserProfile['practicalDifficulties']
}
export interface TrainingExerciseCandidate { id: string; name: string; muscles: string[]; equipment: string[] }
export interface TrainingPlanningContext {
  locale: 'pt-BR'
  goal: UserGoal | null
  experience: string | null
  availableDays: string[]
  durationMinutes: number | null
  equipment: string[]
  preferences: string[]
  physicalLimitations: PhysicalLimitation[]
  candidateExercises: TrainingExerciseCandidate[]
}
export interface TrainingAdjustmentContext extends Pick<TrainingPlanningContext, 'goal' | 'experience' | 'equipment' | 'physicalLimitations' | 'candidateExercises'> { completedSessions: number }

export function buildMealParseContext(profile: UserProfile): MealParseContext {
  return dietaryContext(profile)
}
export function buildMealVisionContext(profile: UserProfile, userHint?: string): MealVisionContext {
  return { ...dietaryContext(profile), userHint: userHint?.trim() || null }
}
export function buildDietPlanningContext(profile: UserProfile, goals: NutritionGoals): DietPlanningContext {
  return { ...dietaryContext(profile), locale: 'pt-BR', goals, mealsPerDay: profile.mealsPerDay, weeklyFoodBudget: profile.weeklyFoodBudget, cookingTimeMinutes: profile.cookingTimeMinutes, cookingSkill: profile.cookingSkill, practicalDifficulties: profile.practicalDifficulties }
}
export function buildTrainingPlanningContext(input: Omit<TrainingPlanningContext, 'locale' | 'goal' | 'physicalLimitations' | 'experience' | 'availableDays' | 'durationMinutes' | 'equipment' | 'preferences'> & { profile: UserProfile }): TrainingPlanningContext {
  if (input.candidateExercises.length > 100) throw new Error('Envie no máximo 100 exercícios candidatos para IA.')
  return { locale: 'pt-BR', goal: input.profile.goal, physicalLimitations: input.profile.physicalLimitations, experience: input.profile.trainingExperience, availableDays: input.profile.trainingDays, durationMinutes: input.profile.sessionDurationMinutes, equipment: input.profile.availableEquipment, preferences: [...input.profile.trainingPreferences, ...input.profile.avoidedExercises.map((value) => `Evitar: ${value}`)], candidateExercises: input.candidateExercises }
}
export function buildTrainingAdjustmentContext(input: Omit<TrainingAdjustmentContext, 'goal' | 'physicalLimitations'> & { profile: UserProfile }): TrainingAdjustmentContext {
  return { ...input, goal: input.profile.goal, physicalLimitations: input.profile.physicalLimitations }
}

export function validateMealParseDraft(value: unknown): MealParseDraft {
  const input = object(value)
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 20) throw invalid('A interpretação deve conter de 1 a 20 alimentos.')
  return { items: input.items.map(validateFoodQuery) }
}
export function validateFoodImageDraft(value: unknown): FoodImageDraft {
  const input = object(value)
  if (!Array.isArray(input.items) || input.items.length > 20 || !Array.isArray(input.uncertainties) || input.uncertainties.length > 10) throw invalid('Resposta visual inválida.')
  return { items: input.items.map((item) => {
    const parsed = validateFoodQuery(item)
    const raw = object(item)
    if (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 1 || typeof raw.estimated !== 'boolean') throw invalid('Confiança visual inválida.')
    return { ...parsed, confidence: raw.confidence, estimated: raw.estimated }
  }), uncertainties: input.uncertainties.map((item) => text(item, 'Incerteza', 180)) }
}
export function validateDietPlanDraft(value: unknown): DietPlanDraft {
  const input = object(value)
  if (!Array.isArray(input.meals) || input.meals.length === 0 || input.meals.length > 12 || !Array.isArray(input.incompatibilities)) throw invalid('Plano alimentar inválido.')
  return { meals: input.meals.map((meal) => {
    const raw = object(meal)
    if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > 20) throw invalid('Itens da refeição inválidos.')
    const name = text(raw.name, 'Nome da refeição', 80)
    return { name, items: raw.items.map((item) => {
      const parsed = validateFoodQuery(item)
      const itemRaw = object(item)
      return { ...parsed, mealName: name, notes: nullableText(itemRaw.notes, 'Observação', 240) }
    }) }
  }), incompatibilities: input.incompatibilities.map((item) => text(item, 'Incompatibilidade', 240)) }
}
export function validateTrainingPlanDraft(value: unknown, allowedExerciseIds: readonly string[]): TrainingPlanDraft {
  const input = object(value)
  if (!Array.isArray(input.days) || input.days.length === 0 || input.days.length > 7 || !Array.isArray(input.incompatibilities)) throw invalid('Plano de treino inválido.')
  const allowed = new Set(allowedExerciseIds)
  return { days: input.days.map((day) => {
    const raw = object(day)
    if (!Array.isArray(raw.exercises) || raw.exercises.length === 0 || raw.exercises.length > 20) throw invalid('Exercícios do dia inválidos.')
    return { name: text(raw.name, 'Nome do dia', 80), exercises: raw.exercises.map((exercise) => {
      const item = object(exercise)
      const exerciseId = text(item.exerciseId, 'ID do exercício', 120)
      if (!allowed.has(exerciseId)) throw invalid('A IA retornou um exercício fora do catálogo permitido.')
      if (typeof item.sets !== 'number' || !Number.isInteger(item.sets) || item.sets < 1 || item.sets > 12) throw invalid('Séries inválidas.')
      const sets = item.sets
      if (typeof item.restSeconds !== 'number' && item.restSeconds !== null) throw invalid('Descanso inválido.')
      if (item.restSeconds !== null && (!Number.isInteger(item.restSeconds) || item.restSeconds < 0 || item.restSeconds > 900)) throw invalid('Descanso inválido.')
      return { exerciseId, sets, repetitions: text(item.repetitions, 'Repetições', 30), restSeconds: item.restSeconds, notes: nullableText(item.notes, 'Observação', 240) }
    }) }
  }), incompatibilities: input.incompatibilities.map((item) => text(item, 'Incompatibilidade', 240)) }
}

function dietaryContext(profile: UserProfile): MealParseContext {
  return { locale: 'pt-BR', foodPreferences: profile.foodPreferences, avoidedFoods: profile.avoidedFoods, allergies: profile.allergies, dietaryRestrictions: profile.dietaryRestrictions }
}
function validateFoodQuery(value: unknown): FoodQueryDraft {
  const input = object(value)
  const quantity = input.quantity
  if (quantity !== null && (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 10_000)) throw invalid('Quantidade inválida.')
  const unit = input.unit
  if (unit !== null && unit !== 'g' && unit !== 'ml' && unit !== 'unit') throw invalid('Unidade inválida.')
  return { query: text(input.query, 'Alimento', 120), quantity, unit: unit as FoodUnit | null }
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('A resposta da IA não é um objeto válido.'); return value as Record<string, unknown> }
function text(value: unknown, label: string, max: number): string { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw invalid(`${label} inválido.`); return value.trim() }
function nullableText(value: unknown, label: string, max: number): string | null { return value == null ? null : text(value, label, max) }
function invalid(message: string): AiProviderError { return new AiProviderError('INVALID_RESPONSE', message) }

export type UserGoal = 'WEIGHT_LOSS' | 'MAINTENANCE' | 'MUSCLE_GAIN' | 'PERFORMANCE' | 'GENERAL_HEALTH'
export type PhysicalLimitationType = 'PAIN_OR_DISCOMFORT' | 'MOBILITY_LIMITATION' | 'PROFESSIONAL_RESTRICTION' | 'OTHER'
export type LimitationSide = 'LEFT' | 'RIGHT' | 'BOTH'
export type PracticalNutritionDifficulty = 'LOW_APPETITE' | 'HIGH_HUNGER' | 'LITTLE_TIME_TO_COOK' | 'EATS_OUT_FREQUENTLY' | 'BREAKFAST_DIFFICULTY' | 'LIMITED_BUDGET' | 'OTHER'

const GOALS: readonly UserGoal[] = ['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN', 'PERFORMANCE', 'GENERAL_HEALTH']
const LIMITATION_TYPES: readonly PhysicalLimitationType[] = ['PAIN_OR_DISCOMFORT', 'MOBILITY_LIMITATION', 'PROFESSIONAL_RESTRICTION', 'OTHER']
const SIDES: readonly LimitationSide[] = ['LEFT', 'RIGHT', 'BOTH']
const DIFFICULTIES: readonly PracticalNutritionDifficulty[] = ['LOW_APPETITE', 'HIGH_HUNGER', 'LITTLE_TIME_TO_COOK', 'EATS_OUT_FREQUENTLY', 'BREAKFAST_DIFFICULTY', 'LIMITED_BUDGET', 'OTHER']
const COOKING_SKILLS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const

export interface PhysicalLimitation {
  bodyArea: string
  side: LimitationSide | null
  type: PhysicalLimitationType
  triggeringMovements: string[]
  professionalRestriction: string | null
  notes: string | null
}

export interface UserProfile {
  heightCm: number | null
  weightKg: number | null
  goal: UserGoal | null
  mealsPerDay: number | null
  foodPreferences: string[]
  avoidedFoods: string[]
  allergies: string[]
  dietaryRestrictions: string[]
  weeklyFoodBudget: number | null
  cookingTimeMinutes: number | null
  cookingSkill: (typeof COOKING_SKILLS)[number] | null
  practicalDifficulties: PracticalNutritionDifficulty[]
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
  trainingDays: string[]
  sessionDurationMinutes: number | null
  availableEquipment: string[]
  trainingPreferences: string[]
  avoidedExercises: string[]
  additionalNotes: string | null
  physicalLimitations: PhysicalLimitation[]
}

export const USER_PROFILE_KEY = 'ai.user-profile'
export const EMPTY_USER_PROFILE: UserProfile = Object.freeze({
  heightCm: null, weightKg: null, goal: null, mealsPerDay: null,
  foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [],
  weeklyFoodBudget: null, cookingTimeMinutes: null, cookingSkill: null,
  practicalDifficulties: [], trainingExperience: null, trainingDays: [], sessionDurationMinutes: null,
  availableEquipment: [], trainingPreferences: [], avoidedExercises: [], additionalNotes: null, physicalLimitations: [],
})

export interface UserProfileRepository { get(): Promise<UserProfile>; save(profile: UserProfile): Promise<UserProfile> }

export function validateUserProfile(value: UserProfile): UserProfile {
  if (!value || typeof value !== 'object') throw new Error('Perfil inválido.')
  const numeric = (input: number | null, label: string, min: number, max: number) => {
    if (input !== null && (!Number.isFinite(input) || input < min || input > max)) throw new Error(`${label} está fora do intervalo permitido.`)
    return input
  }
  const labels = (input: string[], label: string) => {
    if (!Array.isArray(input) || input.length > 30 || input.some((item) => typeof item !== 'string' || !item.trim() || item.length > 120)) throw new Error(`${label} é inválido.`)
    return [...new Set(input.map((item) => item.trim()))]
  }
  if (value.goal !== null && !GOALS.includes(value.goal)) throw new Error('Objetivo inválido.')
  if (value.cookingSkill !== null && !COOKING_SKILLS.includes(value.cookingSkill)) throw new Error('Habilidade culinária inválida.')
  if (value.trainingExperience !== null && !COOKING_SKILLS.includes(value.trainingExperience)) throw new Error('Experiência de treino inválida.')
  if (!Array.isArray(value.practicalDifficulties) || value.practicalDifficulties.some((item) => !DIFFICULTIES.includes(item))) throw new Error('Dificuldades práticas inválidas.')
  if (!Array.isArray(value.physicalLimitations) || value.physicalLimitations.length > 20) throw new Error('Limitações físicas inválidas.')
  const limitations = value.physicalLimitations.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.bodyArea !== 'string' || !item.bodyArea.trim() || item.bodyArea.length > 80 || (item.side !== null && !SIDES.includes(item.side)) || !LIMITATION_TYPES.includes(item.type)) throw new Error('Limitação física inválida.')
    if (!Array.isArray(item.triggeringMovements) || (item.professionalRestriction !== null && typeof item.professionalRestriction !== 'string') || (item.notes !== null && typeof item.notes !== 'string')) throw new Error('Limitação física inválida.')
    if (item.type === 'PROFESSIONAL_RESTRICTION' && !item.professionalRestriction?.trim()) throw new Error('Restrição profissional exige orientação registrada.')
    return { ...item, bodyArea: item.bodyArea.trim(), triggeringMovements: labels(item.triggeringMovements, 'Movimentos'), professionalRestriction: item.professionalRestriction?.trim() || null, notes: item.notes?.trim() || null }
  })
  if (value.mealsPerDay !== null && (!Number.isInteger(value.mealsPerDay) || value.mealsPerDay < 1 || value.mealsPerDay > 12)) throw new Error('Número de refeições é inválido.')
  if (value.additionalNotes !== null && typeof value.additionalNotes !== 'string') throw new Error('Notas adicionais inválidas.')
  return { ...value, heightCm: numeric(value.heightCm, 'Altura', 50, 300), weightKg: numeric(value.weightKg, 'Peso', 10, 500), weeklyFoodBudget: numeric(value.weeklyFoodBudget, 'Orçamento', 0, 100_000), cookingTimeMinutes: numeric(value.cookingTimeMinutes, 'Tempo de preparo', 0, 1_440), sessionDurationMinutes: numeric(value.sessionDurationMinutes, 'Duração da sessão', 1, 1_440), foodPreferences: labels(value.foodPreferences, 'Preferências'), avoidedFoods: labels(value.avoidedFoods, 'Alimentos evitados'), allergies: labels(value.allergies, 'Alergias'), dietaryRestrictions: labels(value.dietaryRestrictions, 'Restrições'), availableEquipment: labels(value.availableEquipment, 'Equipamentos'), trainingPreferences: labels(value.trainingPreferences, 'Preferências de treino'), avoidedExercises: labels(value.avoidedExercises, 'Exercícios evitados'), trainingDays: labels(value.trainingDays, 'Dias de treino'), practicalDifficulties: [...new Set(value.practicalDifficulties)], additionalNotes: value.additionalNotes?.trim() || null, physicalLimitations: limitations }
}

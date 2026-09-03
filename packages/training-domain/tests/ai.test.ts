import { describe, expect, it } from 'vitest'
import {
  EMPTY_USER_PROFILE,
  buildDietPlanningContext,
  buildMealVisionContext,
  buildTrainingPlanningContext,
  validateDietPlanDraft,
  validateFoodImageDraft,
  validateMealParseDraft,
  validateTrainingPlanDraft,
  validateUserProfile,
} from '..'

describe('AI draft boundary', () => {
  it('keeps meal parsing semantic and validates Portuguese quantities', () => {
    expect(validateMealParseDraft({ items: [{ query: 'ovos', quantity: 2, unit: 'unit' }, { query: 'arroz', quantity: 150, unit: 'g' }] })).toEqual({ items: [{ query: 'ovos', quantity: 2, unit: 'unit' }, { query: 'arroz', quantity: 150, unit: 'g' }] })
    expect(() => validateMealParseDraft({ items: [{ query: 'frango', quantity: -1, unit: 'g' }] })).toThrow('Quantidade')
    expect(validateMealParseDraft({ items: [{ query: 'algo desconhecido', quantity: null, unit: null }] }).items[0]).toMatchObject({ quantity: null, unit: null })
  })

  it('marks vision quantities as estimates and preserves the user hint only in its context', () => {
    const vision = validateFoodImageDraft({ items: [{ query: 'frango', quantity: 160, unit: 'g', confidence: 0.42, estimated: true }, { query: 'arroz', quantity: null, unit: null, confidence: 0.2, estimated: true }], uncertainties: ['Molho não visível'] })
    expect(vision.items[0]).toMatchObject({ estimated: true, confidence: 0.42 })
    expect(buildMealVisionContext(EMPTY_USER_PROFILE, 'o frango tem 200g')).toMatchObject({ userHint: 'o frango tem 200g' })
  })

  it('keeps diet targets authoritative and drafts resolveable foods only', () => {
    const context = buildDietPlanningContext({ ...EMPTY_USER_PROFILE, mealsPerDay: 3, allergies: ['amendoim'], cookingTimeMinutes: 15, practicalDifficulties: ['LITTLE_TIME_TO_COOK'] }, { caloriesKcal: 2000, proteinGrams: 120, carbohydratesGrams: 220, fatGrams: 65, fiberGrams: null })
    expect(context).toMatchObject({ mealsPerDay: 3, allergies: ['amendoim'], cookingTimeMinutes: 15 })
    expect(validateDietPlanDraft({ meals: [{ name: 'Café da manhã', items: [{ query: 'banana', quantity: 1, unit: 'unit', notes: null }] }], incompatibilities: [] }).meals[0]?.items[0]).toMatchObject({ query: 'banana', mealName: 'Café da manhã' })
  })

  it('rejects exercise IDs not present in the deterministic candidate list', () => {
    const context = buildTrainingPlanningContext({ profile: { ...EMPTY_USER_PROFILE, goal: 'MUSCLE_GAIN', physicalLimitations: [{ bodyArea: 'ombro', side: 'LEFT', type: 'PROFESSIONAL_RESTRICTION', triggeringMovements: ['overhead press'], professionalRestriction: 'Evitar overhead press.', notes: null }] }, experience: 'intermediário', availableDays: ['SEG', 'TER', 'QUI', 'SEX'], durationMinutes: 60, equipment: ['barra'], preferences: ['supino'], candidateExercises: [{ id: 'bench-press', name: 'Supino', muscles: ['peitoral'], equipment: ['barra'] }] })
    expect(context.physicalLimitations[0]?.professionalRestriction).toBe('Evitar overhead press.')
    expect(() => validateTrainingPlanDraft({ days: [{ name: 'A', exercises: [{ exerciseId: 'overhead-press', sets: 3, repetitions: '8-10', restSeconds: 90, notes: null }] }], incompatibilities: [] }, ['bench-press'])).toThrow('fora do catálogo')
  })

  it('requires explicit guidance for a professional restriction', () => {
    expect(() => validateUserProfile({ ...EMPTY_USER_PROFILE, physicalLimitations: [{ bodyArea: 'ombro', side: null, type: 'PROFESSIONAL_RESTRICTION', triggeringMovements: [], professionalRestriction: null, notes: null }] })).toThrow('orientação registrada')
  })
})

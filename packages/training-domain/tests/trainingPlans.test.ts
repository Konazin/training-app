import { describe, expect, it } from 'vitest'
import {
  TRAINING_PLAN_CATEGORY_PRESETS,
  TRAINING_PLAN_DIFFICULTY_PRESETS,
  TRAINING_PLAN_DUPLICATE_MODES,
  TRAINING_PLAN_TEMPLATES,
  analyzeTrainingPlanWeekPreview,
  isTrainingPlanCategoryPreset,
  isTrainingPlanDifficultyPreset,
  nextTrainingPlanCopyName,
  normalizeTrainingPlanCategory,
  normalizeTrainingPlanDifficulty,
  resolveTrainingPlanCategorySelection,
  resolveTrainingPlanDifficultySelection,
  validateTrainingPlanTemplate,
} from '..'

describe('editor e templates de ficha', () => {
  it('normaliza presets e preserva valores personalizados antigos', () => {
    expect(TRAINING_PLAN_CATEGORY_PRESETS).toContain('Resistência muscular')
    expect(TRAINING_PLAN_DIFFICULTY_PRESETS).toEqual([
      'Iniciante', 'Intermediário', 'Avançado', 'Adaptável',
    ])
    expect(isTrainingPlanCategoryPreset('Força')).toBe(true)
    expect(isTrainingPlanDifficultyPreset('Deload')).toBe(false)
    expect(resolveTrainingPlanCategorySelection('Calistenia')).toEqual({
      kind: 'custom', value: 'Calistenia',
    })
    expect(resolveTrainingPlanDifficultySelection('  Elite   local ')).toEqual({
      kind: 'custom', value: 'Elite local',
    })
    expect(normalizeTrainingPlanCategory('  Força   funcional ')).toBe('Força funcional')
    expect(normalizeTrainingPlanDifficulty('A'.repeat(50))).toHaveLength(50)
    expect(() => normalizeTrainingPlanCategory('A'.repeat(51))).toThrow('50')
    expect(() => normalizeTrainingPlanDifficulty('Outra')).toThrow('Outra')
  })

  it('mantém seis templates imutáveis e com sete weekdays válidos', () => {
    expect(TRAINING_PLAN_TEMPLATES.map((template) => template.id)).toEqual([
      'PPL_3X',
      'FULL_BODY_3X',
      'UPPER_LOWER_4X',
      'RUNNING_BEGINNER',
      'MOBILITY_3X',
      'BLANK',
    ])
    for (const template of TRAINING_PLAN_TEMPLATES) {
      expect(validateTrainingPlanTemplate(template)).toBe(template)
      expect(Object.isFrozen(template)).toBe(true)
      expect(Object.isFrozen(template.days)).toBe(true)
      expect(template.days).toHaveLength(7)
    }
    const duplicate = {
      ...TRAINING_PLAN_TEMPLATES[0]!,
      days: [
        ...TRAINING_PLAN_TEMPLATES[0]!.days.slice(0, 6),
        TRAINING_PLAN_TEMPLATES[0]!.days[0]!,
      ],
    }
    expect(() => validateTrainingPlanTemplate(duplicate)).toThrow('weekdays')
    expect(() => validateTrainingPlanTemplate({
      ...TRAINING_PLAN_TEMPLATES[0]!,
      name: '',
    })).toThrow('nome')
  })

  it('analisa semana sem bloquear dias ainda sem exercícios', () => {
    const days = TRAINING_PLAN_TEMPLATES[0]!.days.map((day) => ({
      ...day,
      exercises: [],
      restActivities: [],
    }))
    const warnings = analyzeTrainingPlanWeekPreview(days)
    expect(warnings.filter((warning) => warning.code === 'TRAINING_DAY_WITHOUT_EXERCISES'))
      .toHaveLength(3)
    expect(warnings).not.toContainEqual(expect.objectContaining({ code: 'NO_REST_DAY' }))
    expect(analyzeTrainingPlanWeekPreview(days.map((day) => ({ ...day, restDay: false }))))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'SEVEN_TRAINING_DAYS' }),
        expect.objectContaining({
          code: 'NO_REST_DAY',
          message: 'Esta ficha não possui dias de descanso.',
        }),
      ]))
  })

  it('expõe três modos e cria nomes de cópia sem colisão normalizada', () => {
    expect(TRAINING_PLAN_DUPLICATE_MODES).toEqual([
      'COMPLETE', 'STRUCTURE_ONLY', 'WITHOUT_LOADS',
    ])
    expect(nextTrainingPlanCopyName('PPL', ['PPL'])).toBe('PPL — Cópia')
    expect(nextTrainingPlanCopyName(' PPL ', ['ppl — cópia', ' PPL  —  Cópia 2 ']))
      .toBe('PPL — Cópia 3')
    expect(nextTrainingPlanCopyName('PPL — Cópia', ['PPL', 'PPL — Cópia']))
      .toBe('PPL — Cópia 2')
    expect(nextTrainingPlanCopyName('PPL — Cópia 2', [
      'PPL', 'PPL — Cópia', 'PPL — Cópia 2',
    ])).toBe('PPL — Cópia 3')
    expect(nextTrainingPlanCopyName('  PPL   —   Cópia  2  ', [
      'ppl — cópia', ' PPL  —  Cópia 2 ',
    ])).toBe('PPL — Cópia 3')
    expect(nextTrainingPlanCopyName('Método Cópia Segura', ['Método Cópia Segura']))
      .toBe('Método Cópia Segura — Cópia')
    expect(nextTrainingPlanCopyName('PPL — Cópia', ['ppl — CÓPIA', 'PPL — cópia 2']))
      .toBe('PPL — Cópia 3')
  })
})

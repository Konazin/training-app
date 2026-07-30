import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TRAINING_PLAN_TEMPLATES } from '@training/training-domain'
import {
  applyTemplateToEditor,
  trainingPlanCategoryIsCustom,
  trainingPlanDifficultyIsCustom,
  validateTrainingPlanEditorValues,
} from './trainingPlanEditor'

describe('editor mobile de fichas', () => {
  it('aceita presets e preserva categoria e dificuldade antigas como customizadas', () => {
    expect(trainingPlanCategoryIsCustom('Força')).toBe(false)
    expect(trainingPlanCategoryIsCustom('Calistenia')).toBe(true)
    expect(trainingPlanDifficultyIsCustom('Intermediário')).toBe(false)
    expect(trainingPlanDifficultyIsCustom('Elite local')).toBe(true)
    expect(validateTrainingPlanEditorValues({
      name: ' Minha ficha ',
      description: ' ',
      category: '  Calistenia ',
      difficulty: ' Elite   local ',
    })).toEqual({
      errors: {},
      values: {
        name: 'Minha ficha',
        description: '',
        category: 'Calistenia',
        difficulty: 'Elite local',
      },
    })
  })

  it('mostra erros por campo para custom vazio e limites', () => {
    expect(validateTrainingPlanEditorValues({
      name: '',
      description: 'A'.repeat(501),
      category: '',
      difficulty: '',
    }).errors).toEqual({
      name: 'Informe o nome da ficha.',
      description: 'Use no máximo 500 caracteres.',
      category: 'Informe a categoria da ficha.',
      difficulty: 'Informe a dificuldade da ficha.',
    })
  })

  it('aplica template sem apagar nome já digitado e mantém draft global imutável', () => {
    const template = TRAINING_PLAN_TEMPLATES[0]!
    expect(applyTemplateToEditor({
      name: 'Meu PPL',
      description: 'Notas',
      category: 'Força',
      difficulty: 'Iniciante',
    }, template)).toEqual({
      name: 'Meu PPL',
      description: 'Notas',
      category: 'Hipertrofia',
      difficulty: 'Intermediário',
    })
    expect(template.days[0]!.title).toBe('Push')
  })

  it('mantém contratos acessíveis de seletor, template, prévia, duplicação e estado sujo', () => {
    const optionSource = source('../../../components/OptionPicker.tsx')
    const templateSource = source('../views/TrainingPlanTemplateModal.tsx')
    const previewSource = source('../views/TrainingPlanWeekPreview.tsx')
    const duplicateSource = source('../views/TrainingPlanDuplicateModal.tsx')
    const editorSource = source('../views/TrainingPlanEditorScreen.tsx')
    expect(optionSource).toContain('accessibilityRole="button"')
    expect(optionSource).toContain('accessibilityRole="radio"')
    expect(optionSource).toContain('minHeight: 56')
    expect(templateSource).toContain('Este template cria a divisão semanal')
    expect(templateSource).toContain('Usar este template')
    expect(previewSource).toContain('Sem exercícios')
    expect(duplicateSource).toContain("'COMPLETE'")
    expect(duplicateSource).toContain("'STRUCTURE_ONLY'")
    expect(duplicateSource).toContain("'WITHOUT_LOADS'")
    expect(duplicateSource).toContain('Duplicando ficha…')
    expect(editorSource).toContain('categoryCustom')
    expect(editorSource).toContain('difficultyCustom')
    expect(editorSource).toContain('templateId')
    expect(editorSource).toContain('Substituir estrutura semanal?')
  })
})

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

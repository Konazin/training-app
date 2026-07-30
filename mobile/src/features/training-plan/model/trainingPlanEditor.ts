import {
  isTrainingPlanCategoryPreset,
  isTrainingPlanDifficultyPreset,
  normalizeTrainingPlanCategory,
  normalizeTrainingPlanDifficulty,
  type TrainingPlanTemplate,
} from '@training/training-domain'

export interface TrainingPlanEditorValues {
  name: string
  description: string
  category: string
  difficulty: string
}

export type TrainingPlanEditorErrors = Partial<Record<keyof TrainingPlanEditorValues, string>>

export function validateTrainingPlanEditorValues(
  values: TrainingPlanEditorValues,
): { errors: TrainingPlanEditorErrors; values?: TrainingPlanEditorValues } {
  const errors: TrainingPlanEditorErrors = {}
  const name = values.name.trim()
  const description = values.description.trim()
  if (!name) errors.name = 'Informe o nome da ficha.'
  else if (name.length > 80) errors.name = 'Use no máximo 80 caracteres.'
  if (description.length > 500) errors.description = 'Use no máximo 500 caracteres.'
  let category = ''
  let difficulty = ''
  try {
    category = normalizeTrainingPlanCategory(values.category)
  } catch (cause) {
    errors.category = cause instanceof Error ? cause.message : 'Informe a categoria.'
  }
  try {
    difficulty = normalizeTrainingPlanDifficulty(values.difficulty)
  } catch (cause) {
    errors.difficulty = cause instanceof Error ? cause.message : 'Informe a dificuldade.'
  }
  return Object.keys(errors).length
    ? { errors }
    : { errors, values: { name, description, category, difficulty } }
}

export const trainingPlanCategoryIsCustom = (value: string) =>
  Boolean(value) && !isTrainingPlanCategoryPreset(value)

export const trainingPlanDifficultyIsCustom = (value: string) =>
  Boolean(value) && !isTrainingPlanDifficultyPreset(value)

export function applyTemplateToEditor(
  current: TrainingPlanEditorValues,
  template: TrainingPlanTemplate,
) {
  return {
    name: current.name.trim() ? current.name : template.id === 'BLANK' ? '' : template.name,
    description: current.description,
    category: template.category || current.category,
    difficulty: template.difficulty || current.difficulty,
  }
}

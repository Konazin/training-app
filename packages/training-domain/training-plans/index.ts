import { DomainError } from '../errors'
import { WEEKDAYS, type TrainingPlanInput, type Weekday } from '../model'

export const TRAINING_PLAN_CATEGORY_PRESETS = Object.freeze([
  'Força',
  'Hipertrofia',
  'Resistência muscular',
  'Condicionamento',
  'Mobilidade',
  'Recuperação',
  'Técnica',
  'Mista',
] as const)

export const TRAINING_PLAN_DIFFICULTY_PRESETS = Object.freeze([
  'Iniciante',
  'Intermediário',
  'Avançado',
  'Adaptável',
] as const)

export type TrainingPlanCategoryPreset = typeof TRAINING_PLAN_CATEGORY_PRESETS[number]
export type TrainingPlanDifficultyPreset = typeof TRAINING_PLAN_DIFFICULTY_PRESETS[number]
export type TrainingPlanSelection<T extends string> =
  | { kind: 'preset'; value: T }
  | { kind: 'custom'; value: string }

const normalizeValue = (value: string, field: string) => {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) throw new DomainError('INVALID_TRAINING_PLAN', `Informe ${field}.`)
  if (normalized.length > 50) {
    throw new DomainError('INVALID_TRAINING_PLAN', `${field} deve ter no máximo 50 caracteres.`)
  }
  if (normalized.toLocaleLowerCase('pt-BR') === 'outra') {
    throw new DomainError('INVALID_TRAINING_PLAN', `${field} personalizada não pode ser “Outra”.`)
  }
  return normalized
}

export const normalizeTrainingPlanCategory = (value: string) =>
  normalizeValue(value, 'a categoria da ficha')

export const normalizeTrainingPlanDifficulty = (value: string) =>
  normalizeValue(value, 'a dificuldade da ficha')

export const isTrainingPlanCategoryPreset = (
  value: string,
): value is TrainingPlanCategoryPreset =>
  TRAINING_PLAN_CATEGORY_PRESETS.some((preset) => preset === value)

export const isTrainingPlanDifficultyPreset = (
  value: string,
): value is TrainingPlanDifficultyPreset =>
  TRAINING_PLAN_DIFFICULTY_PRESETS.some((preset) => preset === value)

export function resolveTrainingPlanCategorySelection(
  value: string,
): TrainingPlanSelection<TrainingPlanCategoryPreset> {
  return isTrainingPlanCategoryPreset(value)
    ? { kind: 'preset', value }
    : { kind: 'custom', value: normalizeTrainingPlanCategory(value) }
}

export function resolveTrainingPlanDifficultySelection(
  value: string,
): TrainingPlanSelection<TrainingPlanDifficultyPreset> {
  return isTrainingPlanDifficultyPreset(value)
    ? { kind: 'preset', value }
    : { kind: 'custom', value: normalizeTrainingPlanDifficulty(value) }
}

export type TrainingPlanTemplateId =
  | 'PPL_3X'
  | 'FULL_BODY_3X'
  | 'UPPER_LOWER_4X'
  | 'RUNNING_BEGINNER'
  | 'MOBILITY_3X'
  | 'BLANK'

export interface TrainingPlanDayCreationInput {
  weekday: Weekday
  title: string
  description: string
  restDay: boolean
  estimatedDurationMinutes: number
  notes: string
}

export interface TrainingPlanCreationInput {
  plan: TrainingPlanInput
  days: readonly TrainingPlanDayCreationInput[]
  templateId?: TrainingPlanTemplateId
}

export interface TrainingPlanTemplate {
  readonly id: TrainingPlanTemplateId
  readonly name: string
  readonly description: string
  readonly category: string
  readonly difficulty: string
  readonly summary: string
  readonly days: readonly TrainingPlanDayCreationInput[]
}

const labels: Record<Weekday, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

function week(configured: Partial<Record<Weekday, string>>): TrainingPlanDayCreationInput[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    title: configured[weekday] ?? labels[weekday],
    description: '',
    restDay: !configured[weekday],
    estimatedDurationMinutes: 0,
    notes: '',
  }))
}

function freezeTemplate(template: TrainingPlanTemplate): TrainingPlanTemplate {
  for (const day of template.days) Object.freeze(day)
  Object.freeze(template.days)
  return Object.freeze(template)
}

export const TRAINING_PLAN_TEMPLATES: readonly TrainingPlanTemplate[] = Object.freeze([
  freezeTemplate({
    id: 'PPL_3X',
    name: 'PPL 3x',
    description: 'Divisão Push, Pull e Legs em três dias da semana.',
    category: 'Hipertrofia',
    difficulty: 'Intermediário',
    summary: '3 treinos · segunda, quarta e sexta',
    days: week({ MONDAY: 'Push', WEDNESDAY: 'Pull', FRIDAY: 'Legs' }),
  }),
  freezeTemplate({
    id: 'FULL_BODY_3X',
    name: 'Full Body 3x',
    description: 'Três treinos de corpo inteiro distribuídos na semana.',
    category: 'Mista',
    difficulty: 'Iniciante',
    summary: '3 treinos · segunda, quarta e sexta',
    days: week({ MONDAY: 'Full Body A', WEDNESDAY: 'Full Body B', FRIDAY: 'Full Body C' }),
  }),
  freezeTemplate({
    id: 'UPPER_LOWER_4X',
    name: 'Upper/Lower 4x',
    description: 'Alterna membros superiores e inferiores em quatro treinos.',
    category: 'Hipertrofia',
    difficulty: 'Intermediário',
    summary: '4 treinos · segunda, terça, quinta e sexta',
    days: week({
      MONDAY: 'Upper A',
      TUESDAY: 'Lower A',
      THURSDAY: 'Upper B',
      FRIDAY: 'Lower B',
    }),
  }),
  freezeTemplate({
    id: 'RUNNING_BEGINNER',
    name: 'Corrida iniciante',
    description: 'Estrutura inicial de três estímulos, sem prescrever ritmo ou distância.',
    category: 'Condicionamento',
    difficulty: 'Iniciante',
    summary: '3 treinos · terça, quinta e sábado',
    days: week({
      TUESDAY: 'Corrida leve',
      THURSDAY: 'Estímulo técnico',
      SATURDAY: 'Corrida longa',
    }),
  }),
  freezeTemplate({
    id: 'MOBILITY_3X',
    name: 'Mobilidade 3x',
    description: 'Três sessões de mobilidade distribuídas na semana.',
    category: 'Mobilidade',
    difficulty: 'Adaptável',
    summary: '3 treinos · segunda, quarta e sexta',
    days: week({ MONDAY: 'Mobilidade A', WEDNESDAY: 'Mobilidade B', FRIDAY: 'Mobilidade C' }),
  }),
  freezeTemplate({
    id: 'BLANK',
    name: 'Ficha vazia',
    description: 'Cria os sete dias sem treinos ou exercícios predefinidos.',
    category: '',
    difficulty: '',
    summary: '7 dias vazios para configurar',
    days: week({}),
  }),
])

export function validateTrainingPlanTemplate(template: TrainingPlanTemplate) {
  if (!template.id.trim() || !template.name.trim()) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'Template sem identificação ou nome.')
  }
  if (template.id !== 'BLANK' && (!template.category.trim() || !template.difficulty.trim())) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'Template sem categoria ou dificuldade.')
  }
  validateTrainingPlanCreationDays(template.days)
  return template
}

export function validateTrainingPlanCreationDays(days: readonly TrainingPlanDayCreationInput[]) {
  if (days.length !== WEEKDAYS.length) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'A ficha deve conter exatamente sete dias.')
  }
  const weekdays = new Set(days.map((day) => day.weekday))
  if (weekdays.size !== WEEKDAYS.length || WEEKDAYS.some((weekday) => !weekdays.has(weekday))) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'A ficha deve conter os sete weekdays sem duplicatas.')
  }
  if (days.some((day) => !day.title.trim())) {
    throw new DomainError('INVALID_TRAINING_PLAN', 'Todo dia precisa de um nome.')
  }
  return days
}

export interface WeekPreviewDay {
  weekday: Weekday
  title: string
  restDay: boolean
  exercises?: readonly unknown[]
  restActivities?: readonly unknown[]
}

export type WeekPreviewWarning =
  | { code: 'NO_TRAINING_DAYS'; message: string }
  | { code: 'TRAINING_DAY_WITHOUT_EXERCISES'; weekday: Weekday; message: string }
  | { code: 'DUPLICATE_WEEKDAY'; message: string }
  | { code: 'MISSING_WEEKDAY'; message: string }
  | { code: 'EMPTY_DAY_NAME'; weekday: Weekday; message: string }
  | { code: 'SEVEN_TRAINING_DAYS'; message: string }
  | { code: 'NO_REST_DAY'; message: string }

export function analyzeTrainingPlanWeekPreview(
  days: readonly (Partial<WeekPreviewDay> & Pick<WeekPreviewDay, 'weekday' | 'title' | 'restDay'>)[],
): WeekPreviewWarning[] {
  const warnings: WeekPreviewWarning[] = []
  const seen = new Set<Weekday>()
  for (const day of days) {
    if (seen.has(day.weekday)) {
      warnings.push({ code: 'DUPLICATE_WEEKDAY', message: 'Há um dia da semana duplicado.' })
    }
    seen.add(day.weekday)
    if (!day.title.trim()) {
      warnings.push({
        code: 'EMPTY_DAY_NAME',
        weekday: day.weekday,
        message: 'Este dia ainda não possui nome.',
      })
    }
    if (!day.restDay && (day.exercises?.length ?? 0) === 0) {
      warnings.push({
        code: 'TRAINING_DAY_WITHOUT_EXERCISES',
        weekday: day.weekday,
        message: 'Este dia ainda não possui exercícios.',
      })
    }
  }
  if (WEEKDAYS.some((weekday) => !seen.has(weekday))) {
    warnings.push({ code: 'MISSING_WEEKDAY', message: 'Há um dia da semana ausente.' })
  }
  const trainingDays = days.filter((day) => !day.restDay)
  if (!trainingDays.length) {
    warnings.push({ code: 'NO_TRAINING_DAYS', message: 'Nenhum dia de treino foi configurado.' })
  }
  if (trainingDays.length === 7) {
    warnings.push({ code: 'SEVEN_TRAINING_DAYS', message: 'Esta ficha possui sete dias consecutivos de treino.' })
  }
  if (days.length && days.every((day) => !day.restDay)) {
    warnings.push({ code: 'NO_REST_DAY', message: 'Esta ficha não possui dias de descanso.' })
  }
  return warnings
}

export type TrainingPlanDuplicateMode = 'COMPLETE' | 'STRUCTURE_ONLY' | 'WITHOUT_LOADS'

export const TRAINING_PLAN_DUPLICATE_MODES: readonly TrainingPlanDuplicateMode[] =
  Object.freeze(['COMPLETE', 'STRUCTURE_ONLY', 'WITHOUT_LOADS'])

const normalizedCopyName = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
const copySuffix = /\s+—\s+cópia(?:\s+\d+)?$/iu

export function nextTrainingPlanCopyName(sourceName: string, existingNames: readonly string[]) {
  const base = sourceName.trim().replace(/\s+/g, ' ').replace(copySuffix, '').trim()
  const existing = new Set(existingNames.map(normalizedCopyName))
  let index = 1
  while (true) {
    const candidate = index === 1 ? `${base} — Cópia` : `${base} — Cópia ${index}`
    if (!existing.has(normalizedCopyName(candidate))) return candidate
    index += 1
  }
}

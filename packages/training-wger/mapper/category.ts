import type { ExerciseCategory } from '@training/training-domain'

export function mapCategory(value: unknown): ExerciseCategory {
  const name = typeof value === 'string'
    ? value
    : isObject(value) && typeof value.name === 'string' ? value.name : ''
  const normalized = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (normalized.includes('cardio')) return 'CARDIO'
  if (normalized.includes('mobil')) return 'MOBILITY'
  if (normalized.includes('stretch') || normalized.includes('along')) return 'STRETCHING'
  if (normalized.includes('recover') || normalized.includes('recuper')) return 'RECOVERY'
  if (normalized.includes('techni') || normalized.includes('tecnic')) return 'TECHNIQUE'
  return 'STRENGTH'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

import type { ExerciseDefinition } from '../../models/training'

export function mergeExercisePages(current: ExerciseDefinition[], next: ExerciseDefinition[], replace = false) {
  return [...new Map((replace ? next : [...current, ...next]).map((item) => [item.id, item])).values()]
}

export function videoPresentation(status: 'idle' | 'loading' | 'readyToPlay' | 'error', hasPoster: boolean) {
  if (status === 'error') return hasPoster ? 'error-poster' : 'error'
  if (status === 'readyToPlay') return 'player'
  return hasPoster ? 'loading-poster' : 'loading-placeholder'
}

export interface AttributionMetadata {
  author?: string | null
  licenseName?: string | null
  licenseUrl?: string | null
  sourceUrl?: string | null
}

export function resolveMediaAttribution(
  media: AttributionMetadata | null | undefined,
  fallback: AttributionMetadata,
) {
  const value = (preferred?: string | null, general?: string | null) =>
    preferred?.trim() || general?.trim() || null
  return {
    author: value(media?.author, fallback.author),
    licenseName: value(media?.licenseName, fallback.licenseName),
    licenseUrl: value(media?.licenseUrl, fallback.licenseUrl),
    sourceUrl: value(media?.sourceUrl, fallback.sourceUrl),
  }
}

export function attributionLabel(metadata: AttributionMetadata) {
  return [metadata.author, metadata.licenseName].filter(Boolean).join(' • ')
    || 'Informação não fornecida pela fonte'
}

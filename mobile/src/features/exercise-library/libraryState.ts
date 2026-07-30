import {
  EXERCISE_PACKS,
  normalizeName,
  rankExerciseSearch,
  type ExerciseDefinition,
  type ExercisePlaceholderKind,
} from '@training/training-domain'

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

export type LibraryFilter =
  | { kind: 'ALL' }
  | { kind: 'FAVORITES' }
  | { kind: 'RECENTS' }
  | { kind: 'MEDIA' }
  | { kind: 'BODYWEIGHT' }
  | { kind: 'EQUIPMENT'; value: string }
  | { kind: 'MUSCLE'; value: string }
  | { kind: 'CATEGORY'; value: string }
  | { kind: 'SOURCE'; value: string }
  | { kind: 'PACK'; value: string }

export function filterExerciseLibrary(
  exercises: readonly ExerciseDefinition[],
  query: string,
  filter: LibraryFilter,
) {
  let filtered = rankExerciseSearch(exercises.filter((exercise) => !exercise.archived), query)
  if (filter.kind === 'FAVORITES') filtered = filtered.filter((exercise) => exercise.favorite)
  if (filter.kind === 'RECENTS') {
    filtered = filtered
      .filter((exercise) => exercise.lastUsedAt)
      .sort((first, second) => second.lastUsedAt!.localeCompare(first.lastUsedAt!))
      .slice(0, 20)
  }
  if (filter.kind === 'MEDIA') filtered = filtered.filter((exercise) => exercise.media.length > 0)
  if (filter.kind === 'BODYWEIGHT') {
    filtered = filtered.filter((exercise) =>
      ['peso corporal', 'sem equipamento'].includes(normalizeName(exercise.equipment)))
  }
  if (filter.kind === 'EQUIPMENT') {
    filtered = filtered.filter((exercise) => exercise.equipment === filter.value)
  }
  if (filter.kind === 'MUSCLE') {
    filtered = filtered.filter((exercise) =>
      exercise.primaryMuscleGroup === filter.value || exercise.secondaryMuscleGroups.includes(filter.value))
  }
  if (filter.kind === 'CATEGORY') filtered = filtered.filter((exercise) => exercise.category === filter.value)
  if (filter.kind === 'SOURCE') filtered = filtered.filter((exercise) => exercise.source === filter.value)
  if (filter.kind === 'PACK') {
    const pack = EXERCISE_PACKS.find((item) => item.id === filter.value)
    const slugs = new Set(pack?.slugs ?? [])
    filtered = filtered.filter((exercise) => exercise.source === 'BUNDLED' && slugs.has(exercise.externalId ?? ''))
  }
  return filtered
}

export function groupExercisesByMuscle(exercises: readonly ExerciseDefinition[]) {
  const groups = new Map<string, ExerciseDefinition[]>()
  for (const exercise of exercises) {
    const current = groups.get(exercise.primaryMuscleGroup) ?? []
    current.push(exercise)
    groups.set(exercise.primaryMuscleGroup, current)
  }
  return [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
    .map(([muscle, items]) => ({ muscle, exercises: items }))
}

export type ResolvedExerciseMedia =
  | { kind: 'IMAGE' | 'VIDEO'; uri: string; local: boolean; attribution: AttributionMetadata }
  | { kind: 'PLACEHOLDER'; placeholder: ExercisePlaceholderKind; attribution: AttributionMetadata }
  | { kind: 'MISSING'; placeholder: ExercisePlaceholderKind; attribution: AttributionMetadata }

export function resolveExerciseMedia(
  exercise: ExerciseDefinition,
  preferred: 'IMAGE' | 'VIDEO' = 'IMAGE',
): ResolvedExerciseMedia {
  const ordered = [
    ...exercise.media.filter((item) => item.type === preferred),
    ...exercise.media.filter((item) => item.type !== preferred),
  ]
  for (const media of ordered) {
    const uri = media.localUri ?? media.remoteUrl
    if (!uri) continue
    const attribution = resolveMediaAttribution(media, exercise)
    if (uri.startsWith('placeholder://')) {
      return {
        kind: 'PLACEHOLDER',
        placeholder: placeholderKind(uri.slice('placeholder://'.length), exercise),
        attribution,
      }
    }
    return { kind: media.type, uri, local: Boolean(media.localUri), attribution }
  }
  return {
    kind: 'MISSING',
    placeholder: placeholderKind('', exercise),
    attribution: resolveMediaAttribution(null, exercise),
  }
}

function placeholderKind(value: string, exercise: ExerciseDefinition): ExercisePlaceholderKind {
  const explicit = value.toUpperCase()
  if (['STRENGTH', 'MOBILITY', 'CARDIO', 'BODYWEIGHT', 'EQUIPMENT'].includes(explicit)) {
    return explicit as ExercisePlaceholderKind
  }
  if (['MOBILITY', 'STRETCHING', 'RECOVERY'].includes(exercise.category)) return 'MOBILITY'
  if (exercise.category === 'CARDIO') return 'CARDIO'
  if (['peso corporal', 'sem equipamento'].includes(normalizeName(exercise.equipment))) return 'BODYWEIGHT'
  return exercise.equipment ? 'EQUIPMENT' : 'STRENGTH'
}

export function libraryEmptyMessage(
  exerciseCount: number,
  query: string,
  filter: LibraryFilter,
) {
  if (!exerciseCount) return 'A biblioteca local está vazia.'
  if (query.trim()) return 'Nenhum exercício corresponde à busca.'
  if (filter.kind === 'FAVORITES') return 'Nenhum exercício favorito ainda.'
  if (filter.kind === 'RECENTS') return 'Nenhum exercício usado recentemente.'
  if (filter.kind !== 'ALL') return 'Nenhum exercício corresponde aos filtros.'
  return 'Nenhum exercício encontrado.'
}

export function exerciseCategoryLabel(category: ExerciseDefinition['category']) {
  return {
    STRENGTH: 'Força',
    HYPERTROPHY: 'Hipertrofia',
    ENDURANCE: 'Resistência',
    CARDIO: 'Condicionamento',
    MOBILITY: 'Mobilidade',
    STRETCHING: 'Alongamento',
    TECHNIQUE: 'Técnica',
    RECOVERY: 'Recuperação',
  }[category]
}

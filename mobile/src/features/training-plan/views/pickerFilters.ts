import type { ExerciseDefinition } from '@training/training-domain'
import { filterExerciseLibrary } from '../../exercise-library/libraryState'

export type QuickFilter = 'ALL' | 'FAVORITES' | 'RECENTS' | 'MEDIA' | 'BODYWEIGHT'

export interface Facets {
  source: string | null
  muscle: string | null
  equipment: string | null
  pack: string | null
}

export const NO_FACETS: Facets = { source: null, muscle: null, equipment: null, pack: null }

/** Aplica busca, atalho e facetas em conjunto: cada faceta restringe ainda mais o resultado. */
export function applyPickerFilters(
  exercises: readonly ExerciseDefinition[],
  query: string,
  quick: QuickFilter,
  facets: Facets,
) {
  let result = filterExerciseLibrary(exercises, query, { kind: quick })
  if (facets.source) result = filterExerciseLibrary(result, '', { kind: 'SOURCE', value: facets.source })
  if (facets.muscle) result = filterExerciseLibrary(result, '', { kind: 'MUSCLE', value: facets.muscle })
  if (facets.equipment) result = filterExerciseLibrary(result, '', { kind: 'EQUIPMENT', value: facets.equipment })
  if (facets.pack) result = filterExerciseLibrary(result, '', { kind: 'PACK', value: facets.pack })
  return result
}

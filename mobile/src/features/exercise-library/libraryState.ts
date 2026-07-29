import type { ExerciseDefinition } from '../../models/training'

export function mergeExercisePages(current: ExerciseDefinition[], next: ExerciseDefinition[], replace = false) {
  return [...new Map((replace ? next : [...current, ...next]).map((item) => [item.id, item])).values()]
}

export function videoPresentation(status: 'idle' | 'loading' | 'readyToPlay' | 'error', hasPoster: boolean) {
  if (status === 'error') return hasPoster ? 'error-poster' : 'error'
  return status === 'readyToPlay' ? 'player' : 'loading'
}

import { describe, expect, test } from 'vitest'
import { mergeExercisePages, videoPresentation } from './libraryState'
import type { ExerciseDefinition } from '../../models/training'

describe('estado da biblioteca', () => {
  test('pagina sem duplicar exercícios e permite substituir nos filtros', () => {
    const exercise = (id: number) => ({ id } as ExerciseDefinition)
    const first = [exercise(1), exercise(2)]
    const second = [exercise(2), exercise(3)]
    expect(mergeExercisePages(first, second).map((item) => item.id)).toEqual([1, 2, 3])
    expect(mergeExercisePages(first, second, true).map((item) => item.id)).toEqual([2, 3])
  })

  test('representa erro do player com e sem poster', () => {
    expect(videoPresentation('error', true)).toBe('error-poster')
    expect(videoPresentation('error', false)).toBe('error')
    expect(videoPresentation('readyToPlay', false)).toBe('player')
  })
})

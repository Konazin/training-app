import { describe, expect, test } from 'vitest'
import {
  attributionLabel,
  mergeExercisePages,
  resolveMediaAttribution,
  videoPresentation,
} from './libraryState'
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
    expect(videoPresentation('loading', true)).toBe('loading-poster')
    expect(videoPresentation('idle', false)).toBe('loading-placeholder')
  })

  test('atribuição acompanha a mídia e usa metadados gerais somente como fallback', () => {
    const resolved = resolveMediaAttribution(
      { author: 'Autor do vídeo', licenseName: null, sourceUrl: 'https://media.test' },
      { author: 'Autor geral', licenseName: 'CC', licenseUrl: 'https://license.test', sourceUrl: 'https://exercise.test' },
    )
    expect(resolved).toEqual({
      author: 'Autor do vídeo',
      licenseName: 'CC',
      licenseUrl: 'https://license.test',
      sourceUrl: 'https://media.test',
    })
    expect(attributionLabel(resolved)).toBe('Autor do vídeo • CC')
    expect(attributionLabel({})).toBe('Informação não fornecida pela fonte')
  })
})

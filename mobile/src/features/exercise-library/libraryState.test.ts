import { describe, expect, test } from 'vitest'
import {
  attributionLabel,
  filterExerciseLibrary,
  exerciseMediaLabel,
  groupExercisesByMuscle,
  hasRealExerciseMedia,
  libraryEmptyMessage,
  mergeExercisePages,
  resolveExerciseMedia,
  resolveMediaAttribution,
  videoPresentation,
} from './libraryState'
import type { ExerciseDefinition, ExerciseMedia } from '../../models/training'

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

  test('busca aliases sem acento e filtra favoritos, músculos, equipamentos e recentes', () => {
    const items = [
      exercise(1, { name: 'Puxada à frente', normalizedName: 'puxada a frente', aliases: ['puxador frente'], primaryMuscleGroup: 'Costas', equipment: 'Máquina', favorite: true }),
      exercise(2, { name: 'Flexão de braços', normalizedName: 'flexao de bracos', aliases: ['apoio'], primaryMuscleGroup: 'Peito', equipment: 'Peso corporal', lastUsedAt: '2026-07-30T12:00:00.000Z' }),
      exercise(3, { name: 'Supino com halteres', normalizedName: 'supino com halteres', aliases: ['dumbbell press'], primaryMuscleGroup: 'Peito', equipment: 'Halteres', lastUsedAt: '2026-07-30T13:00:00.000Z' }),
    ]
    expect(filterExerciseLibrary(items, 'puxador', { kind: 'ALL' }).map((item) => item.id)).toEqual([1])
    expect(filterExerciseLibrary(items, '', { kind: 'FAVORITES' }).map((item) => item.id)).toEqual([1])
    expect(filterExerciseLibrary(items, '', { kind: 'MUSCLE', value: 'Peito' })).toHaveLength(2)
    expect(filterExerciseLibrary(items, '', { kind: 'EQUIPMENT', value: 'Halteres' })[0]?.id).toBe(3)
    expect(filterExerciseLibrary(items, '', { kind: 'RECENTS' }).map((item) => item.id)).toEqual([3, 2])
    const manyRecents = Array.from({ length: 25 }, (_, index) => exercise(index + 10, {
      lastUsedAt: `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    }))
    expect(filterExerciseLibrary(manyRecents, '', { kind: 'RECENTS' })).toHaveLength(20)
    expect(groupExercisesByMuscle(items).find((group) => group.muscle === 'Peito')?.exercises).toHaveLength(2)
  })

  test('resolve placeholder, imagem local, vídeo remoto e ausência sem colapsar', () => {
    const placeholder = media({ localUri: 'placeholder://mobility', source: 'BUNDLED' })
    const illustrated = exercise(1, { media: [placeholder] })
    expect(resolveExerciseMedia(illustrated)).toMatchObject({
      kind: 'PLACEHOLDER',
      placeholder: 'MOBILITY',
    })
    expect(hasRealExerciseMedia(illustrated)).toBe(false)
    expect(exerciseMediaLabel(illustrated)).toBe('Ilustração genérica')
    const image = media({ localUri: 'file:///imagem.png' })
    const withImage = exercise(2, { media: [image] })
    expect(resolveExerciseMedia(withImage)).toMatchObject({
      kind: 'IMAGE',
      local: true,
    })
    const video = media({ type: 'VIDEO', localUri: null, remoteUrl: 'https://video.test/a.mp4' })
    const withVideo = exercise(3, { media: [video] })
    expect(resolveExerciseMedia(withVideo, 'VIDEO')).toMatchObject({
      kind: 'VIDEO',
      local: false,
    })
    expect(exerciseMediaLabel(withImage)).toBe('Imagem')
    expect(exerciseMediaLabel(withVideo)).toBe('Vídeo')
    expect(exerciseMediaLabel(exercise(4, { media: [image, video] }))).toBe('Imagem e vídeo')
    expect(exerciseMediaLabel(exercise(5))).toBe('Sem mídia')
    expect(filterExerciseLibrary([illustrated, withImage], '', { kind: 'MEDIA' }))
      .toEqual([withImage])
  })

  test('diferencia estados vazios', () => {
    expect(libraryEmptyMessage(0, '', { kind: 'ALL' })).toContain('vazia')
    expect(libraryEmptyMessage(2, 'nada', { kind: 'ALL' })).toContain('busca')
    expect(libraryEmptyMessage(2, '', { kind: 'FAVORITES' })).toContain('favorito')
    expect(libraryEmptyMessage(2, '', { kind: 'RECENTS' })).toContain('recentemente')
    expect(libraryEmptyMessage(2, '', { kind: 'MEDIA' })).toContain('filtros')
  })
})

function exercise(id: number, overrides: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  return {
    id,
    name: `Exercício ${id}`,
    normalizedName: `exercicio ${id}`,
    description: '',
    primaryMuscleGroup: 'Geral',
    secondaryMuscleGroups: [],
    equipment: 'Sem equipamento',
    category: 'STRENGTH',
    difficulty: 'Iniciante',
    instructions: '',
    notes: '',
    unilateral: false,
    timed: false,
    source: 'BUNDLED',
    externalId: `exercise_${id}`,
    sourceUrl: null,
    licenseName: null,
    licenseUrl: null,
    author: null,
    archived: false,
    createdAt: '',
    updatedAt: '',
    media: [],
    primaryVideo: null,
    primaryImage: null,
    hasVideo: false,
    primaryVideoUrl: null,
    primaryImageUrl: null,
    custom: false,
    mediaUrl: '',
    aliases: [],
    favorite: false,
    lastUsedAt: null,
    useCount: 0,
    ...overrides,
  }
}

function media(overrides: Partial<ExerciseMedia> = {}): ExerciseMedia {
  return {
    id: 1,
    exerciseDefinitionId: 1,
    type: 'IMAGE',
    source: 'BUNDLED',
    externalId: null,
    remoteUrl: null,
    localUri: null,
    thumbnailRemoteUrl: null,
    thumbnailLocalUri: null,
    mimeType: null,
    width: null,
    height: null,
    durationSeconds: null,
    main: true,
    sortOrder: 0,
    licenseName: null,
    licenseUrl: null,
    author: 'Ilustração genérica do aplicativo',
    sourceUrl: null,
    downloadedAt: null,
    createdAt: '',
    updatedAt: '',
    url: '',
    thumbnailUrl: null,
    ...overrides,
  }
}

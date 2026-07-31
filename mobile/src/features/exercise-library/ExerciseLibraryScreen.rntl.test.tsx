import { createElement } from 'react'
import {
  fireEvent,
  renderAsync,
  screen,
} from '@testing-library/react-native'
import type {
  ExerciseDefinition,
  ExerciseMedia,
} from '@training/training-domain'

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() }

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}))
jest.mock('../../theme', () => ({
  shared: {
    pagePadding: 20,
    spacing: { sm: 8, lg: 16 },
    touchTarget: { minimum: 48 },
  },
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000000' }) }),
}))
jest.mock('../../theme/typography', () => ({
  typography: { body: {}, bodySmall: {}, caption: {}, label: {}, title: {} },
}))
jest.mock('../../components/Screen', () => {
  const { View } = require('react-native')
  return { Screen: View }
})
jest.mock('../../components/ScreenHeader', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    ScreenHeader: ({ title }: { title: string }) =>
      React.createElement(View, null, React.createElement(Text, null, title)),
  }
})

import { ExerciseLibraryScreen } from './ExerciseLibraryScreen'

describe('biblioteca renderizada', () => {
  beforeEach(() => jest.clearAllMocks())

  it('filtra somente mídia real, agrupa por músculo e mantém favorito separado da navegação', async () => {
    const onFavorite = jest.fn(async () => true)
    await renderAsync(createElement(ExerciseLibraryScreen, {
      exercises: [
        exercise(1, 'Flexão', 'Peito', [media('placeholder://bodyweight')]),
        exercise(2, 'Remada', 'Costas', [media('file:///remada.png')], true),
        exercise(3, 'Supino', 'Peito'),
      ],
      loading: false,
      onCreate: jest.fn(),
      onUpdate: jest.fn(),
      onArchive: jest.fn(),
      onFavorite,
    }))

    expect(screen.getByText(/Ilustração genérica$/)).toBeTruthy()
    expect(screen.getByText(/Imagem$/)).toBeTruthy()
    expect(screen.getByText(/Sem mídia$/)).toBeTruthy()

    fireEvent.press(screen.getByText('Com mídia'))
    expect(screen.getByText('Remada')).toBeTruthy()
    expect(screen.queryByText('Flexão')).toBeNull()
    expect(screen.queryByText('Supino')).toBeNull()

    fireEvent.press(screen.getByText('Todos'))
    fireEvent.press(screen.getByText('Por músculo'))
    expect(screen.getByRole('header', { name: 'Costas' })).toBeTruthy()
    expect(screen.getByRole('header', { name: 'Peito' })).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Favoritar Flexão'))
    expect(onFavorite).toHaveBeenCalledWith(1, true)
    expect(mockNavigation.navigate).not.toHaveBeenCalled()

    fireEvent.press(screen.getByLabelText(/Flexão, Peito/))
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ExerciseDetail', { exerciseId: 1 })
  })

  it('mostra biblioteca vazia sem iniciar provider e oferece escolhas explícitas', async () => {
    await renderAsync(createElement(ExerciseLibraryScreen, {
      exercises: [],
      loading: false,
      onCreate: jest.fn(),
      onUpdate: jest.fn(),
      onArchive: jest.fn(),
      onFavorite: jest.fn(),
    }))
    expect(screen.getByText('Sua biblioteca está vazia')).toBeTruthy()
    expect(screen.getByText('Importar pacote recomendado')).toBeTruthy()
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    fireEvent.press(screen.getByText('Pesquisar no Wger'))
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WgerIntegration')
    fireEvent.press(screen.getByText('Continuar sem exercícios'))
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1)
  })
})

function exercise(
  id: number,
  name: string,
  muscle: string,
  mediaItems: ExerciseMedia[] = [],
  favorite = false,
): ExerciseDefinition {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    description: '',
    primaryMuscleGroup: muscle,
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
    media: mediaItems,
    primaryVideo: null,
    primaryImage: null,
    hasVideo: mediaItems.some((item) => item.type === 'VIDEO'),
    primaryVideoUrl: null,
    primaryImageUrl: null,
    custom: false,
    mediaUrl: '',
    aliases: [],
    favorite,
    lastUsedAt: null,
    useCount: 0,
  }
}

function media(uri: string): ExerciseMedia {
  return {
    id: 1,
    exerciseDefinitionId: 1,
    type: 'IMAGE',
    source: 'BUNDLED',
    externalId: null,
    remoteUrl: null,
    localUri: uri,
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
    author: null,
    sourceUrl: null,
    downloadedAt: null,
    createdAt: '',
    updatedAt: '',
    url: uri,
    thumbnailUrl: null,
  }
}

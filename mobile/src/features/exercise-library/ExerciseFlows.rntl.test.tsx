import { createElement } from 'react'
import {
  fireEvent,
  renderAsync,
  screen,
  waitFor,
} from '@testing-library/react-native'
import type {
  ExerciseDefinition,
  ExerciseMedia,
} from '@training/training-domain'

const mockNavigation = { goBack: jest.fn() }
const mockRoute = { params: { exerciseId: 1 } }

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}))
jest.mock('../../theme', () => ({
  shared: {
    pagePadding: 20,
    radii: new Proxy({}, { get: () => 8 }),
    shadow: new Proxy({}, { get: () => ({}) }),
    spacing: new Proxy({}, { get: () => 8 }),
    touchTarget: { minimum: 48 },
  },
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000000' }),
    motion: { duration: 0, translate: false },
  }),
}))
jest.mock('../../theme/typography', () => ({
  typography: { body: {}, bodySmall: {}, caption: {}, label: {}, title: {} },
}))
jest.mock('../../components/Screen', () => {
  const { View } = require('react-native')
  return { Screen: View, ScreenScrollView: View }
})
jest.mock('./ExerciseVideo', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return { ExerciseVideo: () => React.createElement(Text, null, 'PLAYER MONTADO') }
})

import { ExerciseDetailScreen } from './ExerciseDetailScreen'
import { ExercisePicker } from '../training-plan/views/ExercisePicker'

describe('seleção e detalhe renderizados', () => {
  beforeEach(() => jest.clearAllMocks())

  it('protege seleção contra toque duplo', async () => {
    const onSelect = jest.fn()
    await renderAsync(createElement(ExercisePicker, {
      exercises: [exercise()],
      onSelect,
    }))

    const action = screen.getByLabelText('Selecionar Supino, Peito, Barra')
    fireEvent.press(action)
    fireEvent.press(action)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('monta vídeo somente após ação explícita e salva apenas as notas', async () => {
    const onUpdateNotes = jest.fn(async () => true)
    await renderAsync(createElement(ExerciseDetailScreen, {
      exercises: [exercise([video()])],
      onFavorite: jest.fn(async () => true),
      onOpened: jest.fn(async () => true),
      onUpdateNotes,
    }))

    expect(screen.queryByText('PLAYER MONTADO')).toBeNull()
    fireEvent.press(screen.getByText('▶ Reproduzir vídeo'))
    expect(screen.getByText('PLAYER MONTADO')).toBeTruthy()

    fireEvent.press(screen.getByText('Editar notas'))
    fireEvent.changeText(screen.getByLabelText('Notas pessoais do exercício'), 'Nota alterada')
    fireEvent.press(screen.getByText('Salvar notas'))
    await waitFor(() => {
      expect(onUpdateNotes).toHaveBeenCalledWith(1, 'Nota alterada')
      expect(screen.getByText('Notas salvas neste aparelho.')).toBeTruthy()
    })
  })
})

function exercise(media: ExerciseMedia[] = []): ExerciseDefinition {
  return {
    id: 1,
    name: 'Supino',
    normalizedName: 'supino',
    description: 'Descrição',
    primaryMuscleGroup: 'Peito',
    secondaryMuscleGroups: ['Tríceps'],
    equipment: 'Barra',
    category: 'STRENGTH',
    difficulty: 'Iniciante',
    instructions: 'Instruções canônicas',
    notes: '',
    unilateral: false,
    timed: false,
    source: 'BUNDLED',
    externalId: 'supino',
    sourceUrl: null,
    licenseName: null,
    licenseUrl: null,
    author: null,
    archived: false,
    createdAt: '',
    updatedAt: '',
    media,
    primaryVideo: null,
    primaryImage: null,
    hasVideo: media.some((item) => item.type === 'VIDEO'),
    primaryVideoUrl: null,
    primaryImageUrl: null,
    custom: false,
    mediaUrl: '',
    aliases: ['bench press'],
    favorite: false,
    lastUsedAt: null,
    useCount: 0,
  }
}

function video(): ExerciseMedia {
  return {
    id: 1,
    exerciseDefinitionId: 1,
    type: 'VIDEO',
    source: 'WGER',
    externalId: 'video-1',
    remoteUrl: 'https://video.test/supino.mp4',
    localUri: null,
    thumbnailRemoteUrl: null,
    thumbnailLocalUri: null,
    mimeType: 'video/mp4',
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
    url: 'https://video.test/supino.mp4',
    thumbnailUrl: null,
  }
}

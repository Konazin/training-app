import { createElement } from 'react'
import {
  act,
  fireEvent,
  renderAsync,
  screen,
} from '@testing-library/react-native'
import type { ExerciseDefinition, WorkoutSession } from '@training/training-domain'

const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() }

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: jest.fn(),
}))
jest.mock('../../theme', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#111111' }),
    preferences: { workoutHighContrast: false, hapticsEnabled: false },
  }),
}))
jest.mock('../../theme/haptics', () => ({ triggerHaptic: jest.fn() }))
jest.mock('../../components/Screen', () => {
  const { ScrollView, View } = require('react-native')
  return { Screen: View, ScreenScrollView: ScrollView }
})
jest.mock('../../components/ThemedTextInput', () => {
  const { TextInput } = require('react-native')
  return { ThemedTextInput: TextInput }
})
jest.mock('../exercise-library/ExerciseVideo', () => {
  const { View } = require('react-native')
  return { ExerciseVideo: View }
})

import { WorkoutSessionScreen } from './views/WorkoutSessionScreen'

describe('inteligência local renderizada na sessão', () => {
  const actions = {
    onUpdateSet: jest.fn(async () => true),
    onAddSet: jest.fn(async () => true),
    onRemoveSet: jest.fn(async () => true),
    onSetExerciseStatus: jest.fn(async () => true),
    onUpdateExerciseNotes: jest.fn(async () => true),
    onUpdateSessionNotes: jest.fn(async () => true),
    onApplySuggestion: jest.fn(async () => true),
    onSubstituteExercise: jest.fn(async () => true),
    onUndoSubstitution: jest.fn(async () => true),
    onPause: jest.fn(async () => true),
    onResume: jest.fn(async () => true),
    onComplete: jest.fn(async () => true),
    onAbandon: jest.fn(async () => true),
    onStartRest: jest.fn(),
    onAdjustRest: jest.fn(),
    onSkipRest: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  it('mostra referência, aplica ou dispensa sugestão e salva anotações explicitamente', async () => {
    const view = await renderAsync(createElement(WorkoutSessionScreen, {
      session: workout('IN_PROGRESS'),
      history: [workout('COMPLETED')],
      library: [definition(7, 'Supino'), definition(8, 'Flexão inclinada')],
      restTimer: null,
      errors: {},
      busyKeys: new Set<string>(),
      ...actions,
    }))

    expect(screen.getByText('Último desempenho')).toBeTruthy()
    expect(screen.getByText(/Carga anterior: 10 kg/)).toBeTruthy()
    expect(screen.getByText('Sugestão local')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Aplicar nesta sessão'))
    })
    expect(actions.onApplySuggestion).toHaveBeenCalledTimes(1)

    fireEvent.press(screen.getByText('Notas do exercício'))
    fireEvent.changeText(screen.getByLabelText('Anotações do exercício Supino'), 'Execução estável')
    await act(async () => {
      fireEvent.press(screen.getAllByText('Salvar anotação')[0]!)
    })
    expect(actions.onUpdateExerciseNotes).toHaveBeenCalledWith(1, 'Execução estável')

    fireEvent.press(screen.getByText('RPE e notas'))
    fireEvent.changeText(screen.getByLabelText('Observação da série'), 'Cadência controlada')
    fireEvent.press(screen.getByText('Salvar'))
    expect(actions.onUpdateSet).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ notes: 'Cadência controlada' }),
    )

    fireEvent.changeText(screen.getByLabelText('Anotações da sessão'), 'Treino retomado')
    await act(async () => {
      fireEvent.press(screen.getAllByText('Salvar anotação')[1]!)
    })
    expect(actions.onUpdateSessionNotes).toHaveBeenCalledWith('Treino retomado')
    await view.unmountAsync()
  })

  it('permite escolher, desfazer e dispensa a sugestão sem mutação automática', async () => {
    let view = await renderAsync(createElement(WorkoutSessionScreen, {
      session: workout('PAUSED'),
      history: [workout('COMPLETED')],
      library: [definition(7, 'Supino'), definition(8, 'Flexão inclinada')],
      restTimer: null,
      errors: {},
      busyKeys: new Set<string>(),
      ...actions,
    }))
    expect(screen.getByText('SESSÃO PAUSADA')).toBeTruthy()
    expect(screen.getByDisplayValue('Anotação da sessão')).toBeTruthy()
    fireEvent.press(screen.getByText('Dispensar'))
    expect(screen.queryByText('Sugestão local')).toBeNull()
    fireEvent.press(screen.getByText('Ver substituições'))
    await act(async () => {
      fireEvent.press(screen.getByText('Flexão inclinada'))
    })
    expect(actions.onSubstituteExercise).toHaveBeenCalledWith(
      1,
      8,
      'Mesmo grupo muscular e equipamento semelhante.',
    )
    await view.unmountAsync()

    view = await renderAsync(createElement(WorkoutSessionScreen, {
      session: workout('IN_PROGRESS', true),
      history: [],
      library: [definition(7, 'Supino'), definition(8, 'Flexão inclinada')],
      restTimer: null,
      errors: {},
      busyKeys: new Set<string>(),
      ...actions,
    }))
    fireEvent.press(screen.getByText('Desfazer substituição'))
    expect(actions.onUndoSubstitution).toHaveBeenCalledWith(1)
    await view.unmountAsync()
  })
})

function workout(
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED',
  substituted = false,
): WorkoutSession {
  const completed = status === 'COMPLETED'
  return {
    id: completed ? 2 : 1,
    trainingPlanId: 3,
    planDayId: 4,
    workoutName: 'Treino A',
    dayName: 'Segunda',
    scheduledDate: '2026-07-30',
    startedAt: '2026-07-30T10:00:00.000Z',
    completedAt: completed ? '2026-07-29T11:00:00.000Z' : null,
    pausedAt: status === 'PAUSED' ? '2026-07-30T10:10:00.000Z' : null,
    pausedDurationSeconds: 0,
    status,
    totalDurationSeconds: 600,
    overallRpe: completed ? 7 : null,
    notes: 'Anotação da sessão',
    exercises: [{
      id: 1,
      exerciseDefinitionId: 7,
      name: 'Supino',
      muscleGroup: 'Peitoral',
      category: 'STRENGTH',
      timed: false,
      primaryVideoUrl: null,
      primaryImageUrl: null,
      primaryVideoSourceUrl: null,
      primaryVideoLicenseName: null,
      primaryVideoLicenseUrl: null,
      primaryVideoAuthor: null,
      attribution: null,
      sortOrder: 0,
      plannedSets: 1,
      plannedMinReps: 8,
      plannedMaxReps: 10,
      plannedLoad: 10,
      plannedDurationSeconds: null,
      plannedDistance: null,
      restSeconds: 60,
      setType: 'NORMAL',
      status: 'PENDING',
      notes: '',
      userNotes: completed ? 'Boa execução' : 'Anotação atual',
      substituteExerciseDefinitionId: substituted ? 8 : null,
      substituteName: substituted ? 'Flexão inclinada' : null,
      substitutionReason: substituted ? 'Mesmo grupo muscular.' : null,
      sets: [{
        id: 1,
        setNumber: 1,
        reps: 10,
        load: 10,
        durationSeconds: 0,
        distance: 0,
        rpe: completed ? 7 : null,
        completed,
        completedAt: completed ? '2026-07-29T10:30:00.000Z' : null,
        manuallyAdded: false,
        notes: '',
        volume: completed ? 100 : 0,
      }],
    }],
    totalVolume: completed ? 100 : 0,
    completedSets: completed ? 1 : 0,
    totalPlannedSets: 1,
  }
}

function definition(id: number, name: string): ExerciseDefinition {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    description: '',
    primaryMuscleGroup: 'Peitoral',
    secondaryMuscleGroups: [],
    equipment: 'Barra',
    category: 'STRENGTH',
    difficulty: '',
    instructions: '',
    notes: '',
    unilateral: false,
    timed: false,
    source: 'CUSTOM',
    externalId: null,
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
    custom: true,
    mediaUrl: '',
    aliases: [],
    favorite: false,
    lastUsedAt: null,
    useCount: 0,
  }
}

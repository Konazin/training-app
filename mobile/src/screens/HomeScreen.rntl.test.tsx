import { createElement } from 'react'
import { RefreshControl, Text } from 'react-native'
import { act, fireEvent, renderAsync, screen } from '@testing-library/react-native'
import {
  buildWeeklyTrainingOverview,
  type TrainingPlan,
  type Weekday,
  type WorkoutSession,
} from '@training/training-domain'

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('../theme', () => ({
  shared: require('../theme/tokens').shared,
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#111111' }) }),
}))
jest.mock('../components/Screen', () => ({ ScreenScrollView: require('react-native').ScrollView }))
jest.mock('../components/ScreenHeader', () => ({
  ScreenHeader: ({ title, description }: { title: string; description?: string }) => {
    const { Text: Label, View } = require('react-native')
    return <View><Label>{title}</Label>{!!description && <Label>{description}</Label>}</View>
  },
}))

import { HistoryScreen, formatDuration } from './HistoryScreen'
import { HomeScreen } from './HomeScreen'
import { TodayWorkoutCard } from './TodayWorkoutCard'

const everything = () => screen.root.findAllByType(Text).flatMap((node) => node.props.children).join(' ')

describe('Home semanal', () => {
  it('trata ausência de fichas e ficha não ativa com as rotas corretas', async () => {
    const props = homeProps([])
    let view = await renderAsync(createElement(HomeScreen, props))
    expect(screen.getByText('Nenhuma ficha ainda')).toBeTruthy()
    fireEvent.press(screen.getByText('Criar ficha'))
    expect(props.onCreatePlan).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getByText('Ver modelos'))
    expect(props.onOpenPlans).toHaveBeenCalledTimes(1)
    await view.unmountAsync()

    const inactive = plan()
    inactive.active = false
    view = await renderAsync(createElement(HomeScreen, homeProps([inactive])))
    expect(screen.getByText('Escolha uma ficha para hoje')).toBeTruthy()
    expect(screen.queryByText('Sessões recentes')).toBeNull()
    await view.unmountAsync()
  })

  it('mostra treino pronto, referência anterior, progresso, atalhos, badge e refresh', async () => {
    const activePlan = plan()
    const history = completedSession(activePlan, 1)
    history.scheduledDate = '2026-07-23'
    history.startedAt = '2026-07-23T12:00:00.000Z'
    history.completedAt = '2026-07-23T13:00:00.000Z'
    history.exercises[0]!.sets[0]!.load = 22
    const props = homeProps([activePlan], [history])
    const view = await renderAsync(createElement(HomeScreen, props))
    const content = everything()
    expect(content).toContain('Tudo pronto para o treino de hoje.')
    expect(content).toContain('Referência anterior')
    expect(content).toMatch(/Flexão\s*:\s*22\s*kg/)
    expect(content).toContain('0 de 6 treinos concluídos')
    for (const label of ['Ficha ativa', 'Fichas arquivadas', 'Biblioteca', 'Integrações']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText('Lixeira, 2 itens')).toBeTruthy()
    const progress = screen.getAllByRole('progressbar').find((node) => node.props.accessibilityValue?.max === 6)!
    expect(progress.props.accessibilityValue).toMatchObject({ min: 0, max: 6, now: 0 })
    fireEvent.press(screen.getByText('Iniciar treino'))
    expect(props.onStartToday).toHaveBeenCalledWith(1, 4)
    fireEvent.press(screen.getByText('Fichas arquivadas'))
    fireEvent.press(screen.getByText('Lixeira, 2 itens'))
    fireEvent.press(screen.getByText('Biblioteca'))
    fireEvent.press(screen.getByText('Integrações'))
    expect(props.onOpenArchived).toHaveBeenCalledTimes(1)
    expect(props.onOpenTrash).toHaveBeenCalledTimes(1)
    expect(props.onOpenLibrary).toHaveBeenCalledTimes(1)
    expect(props.onOpenIntegrations).toHaveBeenCalledTimes(1)
    act(() => screen.UNSAFE_getByType(RefreshControl).props.onRefresh())
    expect(props.onRefresh).toHaveBeenCalledTimes(1)
    await view.unmountAsync()
  })

  it('cobre descanso, treino vazio, concluído e não concluído', async () => {
    const cases = [
      { prepare: (value: TrainingPlan) => { value.days[3]!.restDay = true }, sessions: [] as WorkoutSession[], expected: 'Descanso planejado', action: 'Ver ficha' },
      { prepare: (value: TrainingPlan) => { value.days[3]!.exercises = [] }, sessions: [] as WorkoutSession[], expected: 'Este treino ainda não possui exercícios.', action: 'Configurar treino' },
      { prepare: () => undefined, sessions: null, expected: 'Treino concluído', action: 'Abrir ficha' },
      { prepare: () => undefined, sessions: null, abandoned: true, expected: 'Sessão não concluída', action: 'Abrir ficha' },
    ]
    for (const testCase of cases) {
      const activePlan = plan()
      testCase.prepare(activePlan)
      const session = testCase.sessions === null
        ? completedSession(activePlan, testCase.abandoned ? 2 : 1, testCase.abandoned ? 'ABANDONED' : 'COMPLETED')
        : null
      const view = await renderAsync(createElement(HomeScreen, homeProps([activePlan], session ? [session] : testCase.sessions ?? [])))
      expect(everything()).toContain(testCase.expected)
      expect(screen.getByText(testCase.action)).toBeTruthy()
      await view.unmountAsync()
    }
  })

  it('trata treino não registrado defensivamente no cartão', async () => {
    const activePlan = plan()
    const missed = buildWeeklyTrainingOverview(activePlan, [], null, new Date(2026, 6, 30, 12)).days[2]!
    const view = await renderAsync(createElement(TodayWorkoutCard, {
      plan: activePlan,
      day: missed,
      session: null,
      references: [],
      blockedByCurrentSession: false,
      onStart: jest.fn(),
      onConfigure: jest.fn(),
      onContinue: jest.fn(),
      onOpenPlan: jest.fn(),
    }))
    expect(screen.getByText('Treino não registrado')).toBeTruthy()
    expect(screen.getByText('Abrir ficha')).toBeTruthy()
    await view.unmountAsync()
  })

  it('prioriza sessão ativa ou pausada, bloqueia novo início e alterna a semana', async () => {
    for (const status of ['IN_PROGRESS', 'PAUSED'] as const) {
      const activePlan = plan()
      const props = homeProps([activePlan], [], completedSession(activePlan, 10, status))
      const view = await renderAsync(createElement(HomeScreen, props))
      expect(screen.getByText(status === 'PAUSED' ? 'Sessão pausada' : 'Sessão em andamento')).toBeTruthy()
      expect(screen.queryByText('Iniciar treino')).toBeNull()
      fireEvent.press(screen.getByText(status === 'PAUSED' ? 'Retomar treino' : 'Continuar treino'))
      expect(props.onContinueSession).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText('Recolher resumo semanal')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Recolher resumo semanal'))
      expect(screen.getByLabelText('Expandir resumo semanal')).toBeTruthy()
      await view.unmountAsync()
    }
  })

  it('mantém sessão ativa ou pausada visível sem ficha ativa e sem duplicar o cartão', async () => {
    const inactive = plan()
    inactive.active = false
    const archived = plan()
    archived.archived = true
    const cases = [
      { plans: [] as TrainingPlan[], status: 'IN_PROGRESS' as const, empty: 'Nenhuma ficha ainda', action: 'Continuar treino' },
      { plans: [inactive], status: 'IN_PROGRESS' as const, empty: 'Escolha uma ficha para hoje', action: 'Continuar treino' },
      { plans: [archived], status: 'IN_PROGRESS' as const, empty: 'Nenhuma ficha ainda', action: 'Continuar treino' },
      { plans: [] as TrainingPlan[], status: 'PAUSED' as const, empty: 'Nenhuma ficha ainda', action: 'Retomar treino' },
    ]
    for (const testCase of cases) {
      const props = homeProps(testCase.plans, [], completedSession(plan(), 20, testCase.status))
      const view = await renderAsync(createElement(HomeScreen, props))
      const heading = testCase.status === 'PAUSED' ? 'Sessão pausada' : 'Sessão em andamento'
      expect(screen.getAllByText(heading)).toHaveLength(1)
      expect(screen.getByText(testCase.empty)).toBeTruthy()
      expect(screen.queryByText('Iniciar treino')).toBeNull()
      fireEvent.press(screen.getByText(testCase.action))
      expect(props.onContinueSession).toHaveBeenCalledTimes(1)
      await view.unmountAsync()
    }
  })

  it('resume no máximo três atividades de descanso e informa as restantes', async () => {
    const activePlan = plan()
    const day = activePlan.days[3]!
    day.restDay = true
    day.restActivities = ['Alongamento', 'Caminhada', 'Mobilidade', 'Yoga', 'Respiração']
      .map((name, index) => ({ id: index + 1, name }) as never)
    const view = await renderAsync(createElement(HomeScreen, homeProps([activePlan])))
    const content = everything()
    expect(content).toContain('Alongamento')
    expect(content).toContain('Caminhada')
    expect(content).toContain('Mobilidade')
    expect(content).toMatch(/e mais\s*2\s*atividades/)
    expect(content).not.toContain('Yoga')
    expect(content).not.toContain('Respiração')
    await view.unmountAsync()
  })
})

describe('Histórico e progresso', () => {
  it('mostra seis métricas, quatro estados, duração, volume, aviso e refresh', async () => {
    const activePlan = plan()
    const sessions = (['COMPLETED', 'ABANDONED', 'IN_PROGRESS', 'PAUSED'] as const)
      .map((status, index) => completedSession(activePlan, index + 1, status))
    sessions[0]!.totalDurationSeconds = 125
    sessions[0]!.totalVolume = 250
    const onRefresh = jest.fn()
    const view = await renderAsync(createElement(HistoryScreen, {
      sessions,
      progress: { completedSessions: 1, completedThisWeek: 1, completionRate: 50, completedExercises: 1, totalDurationSeconds: 125, totalVolume: 250 },
      loading: false,
      warning: 'Atualização parcial.',
      onRefresh,
      onOpenPlan: jest.fn(),
    }))
    for (const label of ['Sessões', 'Esta semana', 'Conclusão', 'Exercícios', 'Tempo', 'Volume']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    for (const label of ['Concluída', 'Não concluída', 'Em andamento', 'Pausada']) {
      expect(everything()).toContain(label)
    }
    expect(everything()).toContain('2 min 5 s')
    expect(everything().match(/250 kg/g)).toHaveLength(2)
    expect(screen.getByText('Atualização parcial.')).toBeTruthy()
    act(() => screen.UNSAFE_getByType(RefreshControl).props.onRefresh())
    expect(onRefresh).toHaveBeenCalledTimes(1)
    await view.unmountAsync()
  })

  it('mantém estado vazio e formatação curta', async () => {
    const onOpenPlan = jest.fn()
    const view = await renderAsync(createElement(HistoryScreen, {
      sessions: [],
      progress: { completedSessions: 0, completedThisWeek: 0, completionRate: 0, completedExercises: 0, totalDurationSeconds: 0, totalVolume: 0 },
      loading: true,
      onRefresh: jest.fn(),
      onOpenPlan,
    }))
    expect(screen.getByText('Nenhuma sessão salva')).toBeTruthy()
    expect(screen.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true)
    fireEvent.press(screen.getByText('Abrir ficha'))
    expect(onOpenPlan).toHaveBeenCalledTimes(1)
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(120)).toBe('2 min')
    await view.unmountAsync()
  })
})

function homeProps(
  plans: TrainingPlan[],
  sessions: WorkoutSession[] = [],
  activeSession: WorkoutSession | null = null,
) {
  return {
    plans,
    sessions,
    loading: false,
    activeSession,
    trashCount: 2,
    now: new Date(2026, 6, 30, 12),
    onRefresh: jest.fn(),
    onCreatePlan: jest.fn(),
    onOpenPlans: jest.fn(),
    onOpenPlanDay: jest.fn(),
    onStartToday: jest.fn(),
    onContinueSession: jest.fn(),
    onOpenArchived: jest.fn(),
    onOpenTrash: jest.fn(),
    onOpenLibrary: jest.fn(),
    onOpenIntegrations: jest.fn(),
  }
}

function plan(): TrainingPlan {
  const weekdays: Weekday[] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
  ]
  return {
    id: 1,
    name: 'Calistenia',
    description: '',
    category: 'Força',
    difficulty: 'Intermediário',
    startDate: null,
    endDate: null,
    active: true,
    archived: false,
    deletedAt: null,
    purgeAt: null,
    days: weekdays.map((weekday, index) => ({
      id: index + 1,
      weekday,
      title: index === 3 ? 'Empurrar' : `Dia ${index + 1}`,
      description: '',
      sortOrder: index,
      restDay: index === 6,
      estimatedDurationMinutes: 35,
      notes: '',
      exercises: index === 6 ? [] : [{
        id: index + 1,
        exercise: { id: 10, name: 'Flexão' },
        sortOrder: 0,
        sets: 3,
      }],
      restActivities: index === 6 ? [{ id: 1, name: 'Caminhada leve' }] : [],
    })),
    createdAt: '',
    updatedAt: '',
  } as TrainingPlan
}

function completedSession(
  trainingPlan: TrainingPlan,
  id: number,
  status: WorkoutSession['status'] = 'COMPLETED',
): WorkoutSession {
  const today = trainingPlan.days[3]!
  return {
    id,
    trainingPlanId: trainingPlan.id,
    planDayId: today.id,
    workoutName: trainingPlan.name,
    dayName: today.title,
    scheduledDate: '2026-07-30',
    startedAt: '2026-07-30T12:00:00.000Z',
    completedAt: ['COMPLETED', 'ABANDONED'].includes(status) ? '2026-07-30T13:00:00.000Z' : null,
    pausedAt: status === 'PAUSED' ? '2026-07-30T12:30:00.000Z' : null,
    pausedDurationSeconds: 0,
    status,
    totalDurationSeconds: 0,
    overallRpe: null,
    notes: '',
    completedSets: 1,
    totalPlannedSets: 3,
    totalVolume: 0,
    exercises: [{
      id: 1,
      exerciseDefinitionId: 10,
      name: 'Flexão',
      status: 'COMPLETED',
      sets: [{
        id: 1,
        setNumber: 1,
        reps: 10,
        load: 10,
        durationSeconds: 0,
        distance: 0,
        rpe: null,
        completed: true,
        completedAt: '2026-07-30T12:10:00.000Z',
        manuallyAdded: false,
        notes: '',
        volume: 100,
      }],
    }],
  } as WorkoutSession
}

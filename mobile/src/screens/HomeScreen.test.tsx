import { createElement, type ElementType } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  buildWeeklyTrainingOverview,
  type TrainingPlan,
  type Weekday,
  type WorkoutSession,
} from '@training/training-domain'

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  RefreshControl: 'RefreshControl',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}))
vi.mock('../theme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}))
vi.mock('../components/Screen', () => ({ ScreenScrollView: 'ScreenScrollView' }))
vi.mock('../components/ScreenHeader', () => ({ ScreenHeader: 'ScreenHeader' }))

import { HistoryScreen, formatDuration } from './HistoryScreen'
import { HomeScreen } from './HomeScreen'
import { TodayWorkoutCard } from './TodayWorkoutCard'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

describe('Home semanal', () => {
  it('trata ausência de fichas e ficha não ativa com as rotas corretas', async () => {
    const props = homeProps([])
    let view = await render(HomeScreen, props)
    expect(text(view)).toContain('Nenhuma ficha ativa')
    press(view, 'Criar primeira ficha')
    expect(props.onCreatePlan).toHaveBeenCalledOnce()
    unmount(view)

    const inactive = plan()
    inactive.active = false
    view = await render(HomeScreen, homeProps([inactive]))
    expect(text(view)).toContain('Escolha sua ficha ativa')
    press(view, 'Abrir fichas')
    expect(text(view)).not.toContain('SESSÕES')
    expect(text(view)).not.toContain('Sessões recentes')
    unmount(view)
  })

  it('mostra treino pronto, referência anterior, progresso, atalhos, badge e refresh', async () => {
    const activePlan = plan()
    const history = completedSession(activePlan, 1)
    history.scheduledDate = '2026-07-23'
    history.startedAt = '2026-07-23T12:00:00.000Z'
    history.completedAt = '2026-07-23T13:00:00.000Z'
    history.exercises[0]!.sets[0]!.load = 22
    const props = homeProps([activePlan], [history])
    const view = await render(HomeScreen, props)
    const content = text(view)
    expect(content).toContain('Tudo pronto para o treino de hoje.')
    expect(content).toContain('Referência anterior')
    expect(content).toMatch(/Flexão\s*:\s*22\s*kg/)
    expect(content).toContain('0 de 6 treinos concluídos')
    expect(content).toContain('Ficha ativa')
    expect(content).toContain('Fichas arquivadas')
    expect(content).toContain('Lixeira')
    expect(content).toContain('Biblioteca')
    expect(content).toContain('Integrações')
    expect(content).toContain('2')
    expect(view.root.findAll((node) => node.props.accessibilityState?.selected === true)).toHaveLength(1)
    const progress = view.root.find((node) => node.props.accessibilityRole === 'progressbar')
    expect(progress.props.accessibilityValue).toMatchObject({ min: 0, max: 6, now: 0 })
    press(view, 'Iniciar treino')
    expect(props.onStartToday).toHaveBeenCalledWith(1, 4)
    press(view, 'Fichas arquivadas')
    press(view, 'Lixeira')
    press(view, 'Biblioteca')
    press(view, 'Integrações')
    expect(props.onOpenArchived).toHaveBeenCalledOnce()
    expect(props.onOpenTrash).toHaveBeenCalledOnce()
    expect(props.onOpenLibrary).toHaveBeenCalledOnce()
    expect(props.onOpenIntegrations).toHaveBeenCalledOnce()
    act(() => view.root.findByType('ScreenScrollView' as never).props.refreshControl.props.onRefresh())
    expect(props.onRefresh).toHaveBeenCalledOnce()
    unmount(view)
  })

  it('cobre descanso, treino vazio, concluído, não registrado e não concluído', async () => {
    const cases = [
      {
        prepare: (value: TrainingPlan) => { value.days[3]!.restDay = true },
        sessions: [] as WorkoutSession[],
        expected: 'Descanso planejado',
        action: 'Ver ficha',
      },
      {
        prepare: (value: TrainingPlan) => { value.days[3]!.exercises = [] },
        sessions: [] as WorkoutSession[],
        expected: 'Este treino ainda não possui exercícios.',
        action: 'Configurar treino',
      },
      {
        prepare: () => undefined,
        sessions: null,
        expected: 'Treino concluído',
        action: 'Abrir ficha',
      },
      {
        prepare: () => undefined,
        sessions: null,
        abandoned: true,
        expected: 'Sessão não concluída',
        action: 'Abrir ficha',
      },
    ]
    for (const testCase of cases) {
      const activePlan = plan()
      testCase.prepare(activePlan)
      const session = testCase.sessions === null
        ? completedSession(activePlan, testCase.abandoned ? 2 : 1, testCase.abandoned ? 'ABANDONED' : 'COMPLETED')
        : null
      const props = homeProps([activePlan], session ? [session] : testCase.sessions ?? [])
      const view = await render(HomeScreen, props)
      expect(text(view)).toContain(testCase.expected)
      expect(text(view)).toContain(testCase.action)
      unmount(view)
    }
  })

  it('trata treino não registrado defensivamente no cartão', async () => {
    const activePlan = plan()
    const missed = buildWeeklyTrainingOverview(
      activePlan,
      [],
      null,
      new Date(2026, 6, 30, 12),
    ).days[2]!
    const view = await render(TodayWorkoutCard, {
      plan: activePlan,
      day: missed,
      session: null,
      references: [],
      blockedByCurrentSession: false,
      onStart: vi.fn(),
      onConfigure: vi.fn(),
      onContinue: vi.fn(),
      onOpenPlan: vi.fn(),
    })
    expect(text(view)).toContain('Treino não registrado')
    expect(text(view)).toContain('Abrir ficha')
    unmount(view)
  })

  it('prioriza sessão ativa ou pausada, bloqueia novo início e alterna a semana', async () => {
    for (const status of ['IN_PROGRESS', 'PAUSED'] as const) {
      const activePlan = plan()
      const current = completedSession(activePlan, 10, status)
      const props = homeProps([activePlan], [], current)
      const view = await render(HomeScreen, props)
      expect(text(view)).toContain(status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO')
      expect(text(view)).not.toContain('Iniciar treino')
      press(view, status === 'PAUSED' ? 'Retomar treino' : 'Continuar treino')
      expect(props.onContinueSession).toHaveBeenCalledOnce()
      expect(view.root.findAll((node) => node.props.accessibilityState?.expanded === true)).toHaveLength(1)
      press(view, 'Recolher')
      expect(view.root.findAll((node) => node.props.accessibilityState?.expanded === false)).toHaveLength(1)
      expect(text(view)).not.toContain('SEG')
      unmount(view)
    }
  })

  it('mantém sessão ativa ou pausada visível sem ficha ativa e sem duplicar o cartão', async () => {
    const inactive = plan()
    inactive.active = false
    const archived = plan()
    archived.archived = true
    const cases = [
      { plans: [] as TrainingPlan[], status: 'IN_PROGRESS' as const, empty: 'Nenhuma ficha ativa', action: 'Continuar treino' },
      { plans: [inactive], status: 'IN_PROGRESS' as const, empty: 'Escolha sua ficha ativa', action: 'Continuar treino' },
      { plans: [archived], status: 'IN_PROGRESS' as const, empty: 'Nenhuma ficha ativa', action: 'Continuar treino' },
      { plans: [] as TrainingPlan[], status: 'PAUSED' as const, empty: 'Nenhuma ficha ativa', action: 'Retomar treino' },
    ]
    for (const testCase of cases) {
      const current = completedSession(plan(), 20, testCase.status)
      const props = homeProps(testCase.plans, [], current)
      const view = await render(HomeScreen, props)
      const content = text(view)
      const heading = testCase.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO'
      expect(content.match(new RegExp(heading, 'g'))).toHaveLength(1)
      expect(content).toContain(testCase.empty)
      expect(content).not.toContain('Iniciar treino')
      press(view, testCase.action)
      expect(props.onContinueSession).toHaveBeenCalledOnce()
      unmount(view)
    }
  })

  it('resume no máximo três atividades de descanso e informa as restantes', async () => {
    const activePlan = plan()
    const day = activePlan.days[3]!
    day.restDay = true
    day.restActivities = ['Alongamento', 'Caminhada', 'Mobilidade', 'Yoga', 'Respiração']
      .map((name, index) => ({ id: index + 1, name }) as never)
    const view = await render(HomeScreen, homeProps([activePlan]))
    const content = text(view)
    expect(content).toContain('Alongamento')
    expect(content).toContain('Caminhada')
    expect(content).toContain('Mobilidade')
    expect(content).toMatch(/\+\s*2\s*atividades/)
    expect(content).not.toContain('Yoga')
    expect(content).not.toContain('Respiração')
    unmount(view)
  })
})

describe('Histórico e progresso', () => {
  it('mostra seis métricas, quatro estados, duração, volume opcional, warning e refresh', async () => {
    const activePlan = plan()
    const sessions = (['COMPLETED', 'ABANDONED', 'IN_PROGRESS', 'PAUSED'] as const)
      .map((status, index) => completedSession(activePlan, index + 1, status))
    sessions[0]!.totalDurationSeconds = 125
    sessions[0]!.totalVolume = 250
    const onRefresh = vi.fn()
    const view = await render(HistoryScreen, {
      sessions,
      progress: {
        completedSessions: 1,
        completedThisWeek: 1,
        completionRate: 50,
        completedExercises: 1,
        totalDurationSeconds: 125,
        totalVolume: 250,
      },
      loading: false,
      warning: 'Atualização parcial.',
      onRefresh,
    })
    const content = text(view)
    for (const label of ['SESSÕES', 'ESTA SEMANA', 'CONCLUSÃO', 'EXERCÍCIOS', 'MINUTOS', 'VOLUME']) {
      expect(content).toContain(label)
    }
    for (const label of ['Concluída', 'Não concluída', 'Em andamento', 'Pausada']) {
      expect(content).toContain(label)
    }
    expect(content).toContain('2 min 5 s')
    expect(content.match(/250 kg/g)).toHaveLength(2)
    expect(content).toContain('Atualização parcial.')
    act(() => view.root.findByType('ScreenScrollView' as never).props.refreshControl.props.onRefresh())
    expect(onRefresh).toHaveBeenCalledOnce()
    unmount(view)
  })

  it('mantém estado vazio e formatação curta', async () => {
    const view = await render(HistoryScreen, {
      sessions: [],
      progress: {
        completedSessions: 0,
        completedThisWeek: 0,
        completionRate: 0,
        completedExercises: 0,
        totalDurationSeconds: 0,
        totalVolume: 0,
      },
      loading: true,
      onRefresh: vi.fn(),
    })
    expect(text(view)).toContain('Nenhuma sessão registrada')
    expect(view.root.findByType('ScreenScrollView' as never).props.refreshControl.props.refreshing)
      .toBe(true)
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(120)).toBe('2 min')
    unmount(view)
  })
})

async function render(
  component: ElementType,
  props: Record<string, unknown>,
) {
  let view!: ReactTestRenderer
  await act(async () => { view = create(createElement(component as never, props as never)) })
  return view
}

function unmount(view: ReactTestRenderer) {
  act(() => view.unmount())
}

function text(view: ReactTestRenderer) {
  return view.root.findAllByType('Text' as never).flatMap((node) => node.children).join(' ')
}

function press(view: ReactTestRenderer, label: string) {
  const target = view.root.findAllByType('Pressable' as never).find((node) =>
    node.findAllByType('Text' as never).flatMap((textNode) => textNode.children).join(' ').includes(label))
  expect(target, `Botão “${label}” não encontrado`).toBeDefined()
  act(() => target!.props.onPress())
}

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
    onRefresh: vi.fn(),
    onCreatePlan: vi.fn(),
    onOpenPlans: vi.fn(),
    onOpenPlanDay: vi.fn(),
    onStartToday: vi.fn(),
    onContinueSession: vi.fn(),
    onOpenArchived: vi.fn(),
    onOpenTrash: vi.fn(),
    onOpenLibrary: vi.fn(),
    onOpenIntegrations: vi.fn(),
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

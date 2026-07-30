import { createElement, useMemo } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateHistoryProgress, type WorkoutSession } from '@training/training-domain'

const mocks = vi.hoisted(() => ({
  appStateListener: null as null | ((state: string) => void),
  focusCallback: null as null | (() => void),
  remove: vi.fn(),
}))

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
      mocks.appStateListener = listener
      return { remove: mocks.remove }
    }),
  },
}))
vi.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => { mocks.focusCallback = callback },
}))

import {
  useLocalCalendarClock,
  useRefreshOnFocus,
  useRefreshUi,
} from './useRefreshUi'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
  mocks.appStateListener = null
  mocks.focusCallback = null
  mocks.remove.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('refresh visual completo', () => {
  it('permanece ativo até o refresh inteiro terminar e deduplica gestos concorrentes', async () => {
    const pending = deferred<{ success: true; failedParts: [] }>()
    const refreshAll = vi.fn(() => pending.promise)
    const hook = await renderHook(() => useRefreshUi(refreshAll))
    let first!: Promise<void>
    act(() => {
      first = hook.current.refresh()
      void hook.current.refresh()
    })
    expect(hook.current.refreshing).toBe(true)
    expect(refreshAll).toHaveBeenCalledOnce()
    await act(async () => {
      pending.resolve({ success: true, failedParts: [] })
      await first
    })
    expect(hook.current.refreshing).toBe(false)
    expect(hook.current.warning).toBe('')
    hook.unmount()
  })

  it('limpa o estado após rejeição e não atualiza depois do unmount', async () => {
    const rejected = deferred<never>()
    const first = await renderHook(() => useRefreshUi(() => rejected.promise))
    let operation!: Promise<void>
    act(() => { operation = first.current.refresh() })
    expect(first.current.refreshing).toBe(true)
    await act(async () => {
      rejected.reject(new Error('falha'))
      await operation
    })
    expect(first.current.refreshing).toBe(false)
    expect(first.current.warning).toBe('Não foi possível atualizar as informações.')
    first.unmount()

    const pending = deferred<{ success: true; failedParts: [] }>()
    const onSettled = vi.fn()
    const second = await renderHook(() => useRefreshUi(() => pending.promise, onSettled))
    act(() => { operation = second.current.refresh() })
    second.unmount()
    await act(async () => {
      pending.resolve({ success: true, failedParts: [] })
      await operation
    })
    expect(onSettled).not.toHaveBeenCalled()
  })
})

describe('relógio local de Home e Histórico', () => {
  it('atualiza a data no foreground e remove o listener no unmount', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 2, 23, 59))
    const hook = await renderHook(useLocalCalendarClock)
    expect(hook.current.clock.dateKey).toBe('2026-08-02')
    vi.setSystemTime(new Date(2026, 7, 3, 0, 1))
    act(() => mocks.appStateListener?.('active'))
    expect(hook.current.clock.dateKey).toBe('2026-08-03')
    hook.unmount()
    expect(mocks.remove).toHaveBeenCalledOnce()
  })

  it('atualiza no foco e recalcula o Histórico ao mudar de semana local', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 2, 12))
    const history = completedSession('2026-08-02')
    const hook = await renderHook(() => {
      const calendar = useLocalCalendarClock()
      useRefreshOnFocus(calendar.refreshClock)
      const progress = useMemo(
        () => calculateHistoryProgress([history], calendar.clock.now),
        [calendar.clock.dateKey],
      )
      return { ...calendar, progress }
    })
    expect(hook.current.progress.completedThisWeek).toBe(1)
    vi.setSystemTime(new Date(2026, 7, 3, 12))
    act(() => mocks.focusCallback?.())
    expect(hook.current.clock.dateKey).toBe('2026-08-03')
    expect(hook.current.progress.completedThisWeek).toBe(0)
    hook.unmount()
  })
})

async function renderHook<T>(useHook: () => T) {
  let current!: T
  let renderer!: ReactTestRenderer
  function Harness() {
    current = useHook()
    return null
  }
  await act(async () => { renderer = create(createElement(Harness)) })
  return {
    get current() { return current },
    unmount: () => act(() => renderer.unmount()),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function completedSession(scheduledDate: string): WorkoutSession {
  return {
    id: 1,
    trainingPlanId: 1,
    planDayId: 1,
    workoutName: 'Ficha',
    dayName: 'Domingo',
    scheduledDate,
    startedAt: `${scheduledDate}T12:00:00.000Z`,
    completedAt: `${scheduledDate}T13:00:00.000Z`,
    pausedAt: null,
    pausedDurationSeconds: 0,
    status: 'COMPLETED',
    totalDurationSeconds: 3600,
    overallRpe: null,
    notes: '',
    completedSets: 0,
    totalPlannedSets: 0,
    totalVolume: 0,
    exercises: [],
  }
}

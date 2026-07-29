import { describe, expect, test } from 'vitest'
import { adjustRestTimer, resumeRestTimer, type RestTimerState } from './workoutSession'

const timer: RestTimerState = {
  sessionId: 1,
  exerciseId: 2,
  setId: 3,
  endsAt: 20_000,
  paused: false,
}

describe('cronômetro de descanso', () => {
  test('+15 segundos em timer ativo', () => {
    expect(adjustRestTimer(timer, 15, 10_000).endsAt).toBe(35_000)
  })

  test('-15 segundos em timer ativo respeita o instante atual', () => {
    expect(adjustRestTimer(timer, -15, 10_000).endsAt).toBe(10_000)
  })

  test('+15 segundos em timer pausado usa pausedAt', () => {
    expect(adjustRestTimer({ ...timer, paused: true, pausedAt: 10_000 }, 15, 90_000).endsAt)
      .toBe(35_000)
  })

  test('-15 segundos em timer pausado respeita o limite congelado', () => {
    expect(adjustRestTimer({ ...timer, paused: true, pausedAt: 10_000 }, -15, 90_000).endsAt)
      .toBe(10_000)
  })

  test('retomar preserva o tempo restante', () => {
    const resumed = resumeRestTimer(
      { ...timer, endsAt: 35_000, paused: true, pausedAt: 10_000 },
      50_000,
    )
    expect(resumed.endsAt - 50_000).toBe(25_000)
    expect(resumed.paused).toBe(false)
    expect(resumed.pausedAt).toBeUndefined()
  })
})

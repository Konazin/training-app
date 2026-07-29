import { describe, expect, it } from 'vitest'
import { adjustRestTimer, resumeRestTimer } from './restTimer'

describe('rest timer local', () => {
  it('sobrevive por timestamp, pausa e retoma sem depender de servidor', () => {
    const timer = {
      sessionId: 3,
      exerciseId: 4,
      setId: 5,
      endsAt: 10_000,
      paused: false,
    }
    expect(adjustRestTimer(timer, 15, 5_000).endsAt).toBe(25_000)
    expect(resumeRestTimer({ ...timer, paused: true, pausedAt: 4_000 }, 9_000).endsAt).toBe(15_000)
  })
})

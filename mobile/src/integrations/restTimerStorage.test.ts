import { beforeEach, describe, expect, it, vi } from 'vitest'

const values = new Map<string, string>()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value) },
    removeItem: async (key: string) => { values.delete(key) },
  },
}))

beforeEach(() => values.clear())

describe('restTimerStorage', () => {
  it('recupera timer da sessão após reconstruir os módulos e descarta outra sessão', async () => {
    const firstRuntime = await import('./restTimerStorage')
    await firstRuntime.restTimerStorage.set({
      sessionId: 7,
      exerciseId: 8,
      setId: 9,
      endsAt: Date.now() + 60_000,
      paused: false,
    })

    vi.resetModules()
    const restartedRuntime = await import('./restTimerStorage')
    expect(await restartedRuntime.restTimerStorage.get(7)).toMatchObject({
      sessionId: 7,
      exerciseId: 8,
      setId: 9,
    })
    expect(await restartedRuntime.restTimerStorage.get(99)).toBeNull()
  })
})

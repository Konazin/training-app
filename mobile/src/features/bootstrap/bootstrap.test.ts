import { describe, expect, test, vi } from 'vitest'
import { bootstrapApp, singleFlight } from './bootstrap'

describe('bootstrap local', () => {
  test('carrega repositories locais sem health check ou rede', async () => {
    const refresh = vi.fn(async () => true)
    await expect(bootstrapApp([refresh, refresh, refresh])).resolves.toBeUndefined()
    expect(refresh).toHaveBeenCalledTimes(3)
  })

  test('não libera as telas com leitura local incompleta', async () => {
    await expect(bootstrapApp([async () => true, async () => false]))
      .rejects.toThrow('dados iniciais')
  })

  test('duas tentativas simultâneas compartilham a execução', async () => {
    let release!: () => void
    const operation = vi.fn(() => new Promise<void>((resolve) => { release = resolve }))
    const run = singleFlight(operation)
    const first = run()
    const second = run()
    expect(operation).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    release()
    await Promise.all([first, second])
  })
})

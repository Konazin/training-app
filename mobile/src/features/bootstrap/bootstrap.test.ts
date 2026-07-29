import { describe, expect, test, vi } from 'vitest'
import { bootstrapApp, singleFlight } from './bootstrap'

describe('bootstrap', () => {
  test('consulta health antes de atualizar o domínio', async () => {
    const order: string[] = []
    await bootstrapApp(async () => { order.push('health') }, [
      async () => { order.push('session'); return true },
      async () => { order.push('plans'); return true },
    ])
    expect(order[0]).toBe('health')
    expect(order.slice(1).sort()).toEqual(['plans', 'session'])
  })

  test('não carrega domínio quando a API está indisponível', async () => {
    const refresh = vi.fn(async () => true)
    await expect(bootstrapApp(async () => { throw new Error('offline') }, [refresh])).rejects.toThrow('offline')
    expect(refresh).not.toHaveBeenCalled()
  })

  test('dashboard 500 ou token inválido impedem liberar telas normais', async () => {
    await expect(bootstrapApp(async () => ({ status: 'ok' }), [
      async () => true,
      async () => false,
    ])).rejects.toThrow('dados iniciais')
    await expect(bootstrapApp(async () => ({ status: 'ok' }), [
      async () => false,
    ])).rejects.toThrow('dados iniciais')
  })

  test('aprova bootstrap somente quando todas as cargas são válidas', async () => {
    await expect(bootstrapApp(async () => ({ status: 'ok' }), [
      async () => true,
      async () => true,
      async () => true,
    ])).resolves.toBeUndefined()
  })

  test('duas chamadas simultâneas compartilham uma única execução', async () => {
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

  test('retorno do background pode falhar sem descartar o estado já válido', async () => {
    const previousState = 'ready'
    await expect(bootstrapApp(async () => ({ status: 'ok' }), [
      async () => false,
    ])).rejects.toThrow()
    expect(previousState).toBe('ready')
  })
})

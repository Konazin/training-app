import { describe, expect, test, vi } from 'vitest'
import { bootstrapApp } from './bootstrap'

describe('bootstrap', () => {
  test('consulta health antes de atualizar o domínio', async () => {
    const order: string[] = []
    await bootstrapApp(async () => { order.push('health') }, [
      async () => { order.push('session') },
      async () => { order.push('plans') },
    ])
    expect(order[0]).toBe('health')
    expect(order.slice(1).sort()).toEqual(['plans', 'session'])
  })

  test('não carrega domínio quando a API está indisponível', async () => {
    const refresh = vi.fn()
    await expect(bootstrapApp(async () => { throw new Error('offline') }, [refresh])).rejects.toThrow('offline')
    expect(refresh).not.toHaveBeenCalled()
  })
})

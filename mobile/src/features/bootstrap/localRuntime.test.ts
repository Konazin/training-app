import { describe, expect, it, vi } from 'vitest'
import type { LocalRepositories, SqlDatabase } from '@training/training-local-db'
import { createLocalRuntimeManager, type RuntimeDependencies } from './localRuntime'

describe('gerenciador do runtime SQLite', () => {
  it('fecha conexão em falha de seed e permite retry limpo', async () => {
    const first = fakeDatabase()
    const second = fakeDatabase()
    let attempt = 0
    const dependencies = fakeDependencies({
      open: async () => attempt++ === 0 ? first.database : second.database,
      initialize: async () => {
        if (attempt === 1) throw new Error('seed falhou')
      },
    })
    const runtime = createLocalRuntimeManager(dependencies)
    await expect(runtime.start(() => {})).rejects.toThrow('seed falhou')
    expect(first.close).toHaveBeenCalledTimes(1)
    await expect(runtime.start(() => {})).resolves.toMatchObject({ database: second.database })
    await runtime.dispose()
    expect(second.close).toHaveBeenCalledTimes(1)
  })

  it('fecha conexão quando repositories falham', async () => {
    const opened = fakeDatabase()
    const runtime = createLocalRuntimeManager(fakeDependencies({
      open: async () => opened.database,
      createRepositories: () => { throw new Error('repositories falharam') },
    }))
    await expect(runtime.start(() => {})).rejects.toThrow('repositories falharam')
    expect(opened.close).toHaveBeenCalledTimes(1)
  })

  it('compartilha a Promise simultânea e fecha uma vez durante unmount', async () => {
    const opened = fakeDatabase()
    let release!: () => void
    const initialize = vi.fn(() => new Promise<void>((resolve) => { release = resolve }))
    const runtime = createLocalRuntimeManager(fakeDependencies({
      open: async () => opened.database,
      initialize,
    }))
    const first = runtime.start(() => {})
    const second = runtime.start(() => {})
    expect(first).toBe(second)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(initialize).toHaveBeenCalledTimes(1)
    const disposed = runtime.dispose()
    release()
    await expect(first).rejects.toThrow('cancelada')
    await disposed
    expect(opened.close).toHaveBeenCalledTimes(1)
  })

  it('não deixa conexão aberta quando migration falha', async () => {
    const opened = fakeDatabase()
    const runtime = createLocalRuntimeManager(fakeDependencies({
      open: async () => {
        await opened.database.close()
        throw new Error('migration falhou')
      },
    }))
    await expect(runtime.start(() => {})).rejects.toThrow('migration falhou')
    expect(opened.close).toHaveBeenCalledTimes(1)
  })
})

function fakeDependencies(overrides: Partial<RuntimeDependencies> = {}): RuntimeDependencies {
  return {
    open: async () => fakeDatabase().database,
    initialize: async () => {},
    createRepositories: () => ({}) as LocalRepositories,
    markStartup: async () => {},
    ...overrides,
  }
}

function fakeDatabase() {
  const close = vi.fn(async () => {})
  return {
    close,
    database: {
      exec: async () => {},
      run: async () => ({ lastInsertRowId: 0, changes: 0 }),
      first: async () => null,
      all: async () => [],
      transaction: async (operation) => operation({} as SqlDatabase),
      close,
    } satisfies SqlDatabase,
  }
}

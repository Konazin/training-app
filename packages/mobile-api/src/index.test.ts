import { afterEach, describe, expect, test, vi } from 'vitest'
import { createApiClient } from './index'

describe('cliente HTTP', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('normaliza o primeiro erro de campo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Inválido', fields: { name: 'Nome obrigatório' } }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(createApiClient({ baseUrl: 'http://localhost/api/' }).request('/plans'))
      .rejects.toMatchObject({
        message: 'Nome obrigatório',
        status: 422,
        fields: { name: 'Nome obrigatório' },
      })
  })
})

import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError, createApiClient } from './index'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('cliente HTTP', () => {
  test('envia token e normaliza o primeiro erro de campo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Inválido', fields: { name: 'Nome obrigatório' } }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    ))
    await expect(createApiClient({ baseUrl: 'http://localhost/api/', accessToken: 'beta', fetchImpl })
      .request('/plans')).rejects.toMatchObject({
      message: 'Nome obrigatório', status: 422, fields: { name: 'Nome obrigatório' }, kind: 'HTTP',
    })
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer beta')
  })

  test('rejeita configuração vazia sem chamar a rede', async () => {
    const fetchImpl = vi.fn()
    await expect(createApiClient({ baseUrl: ' ', fetchImpl }).request('/health'))
      .rejects.toMatchObject({ kind: 'CONFIGURATION' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('distingue timeout e cancelamento externo', async () => {
    vi.useFakeTimers()
    const pending = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })) as typeof fetch
    const timeoutPromise = createApiClient({ baseUrl: 'https://api.test', fetchImpl: pending, timeoutMs: 10, retryGet: 0 })
      .request('/slow')
    const timeoutAssertion = expect(timeoutPromise).rejects.toMatchObject({ kind: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(11)
    await timeoutAssertion

    const external = new AbortController()
    const cancelled = createApiClient({ baseUrl: 'https://api.test', fetchImpl: pending, retryGet: 0 })
      .request('/slow', { signal: external.signal })
    external.abort()
    await expect(cancelled).rejects.toMatchObject({ kind: 'CANCELLED' })
  })

  test('repete somente GET transitório', async () => {
    const getFetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await expect(createApiClient({ baseUrl: 'https://api.test', fetchImpl: getFetch }).request('/health'))
      .resolves.toEqual({ ok: true })
    expect(getFetch).toHaveBeenCalledTimes(2)

    const postFetch = vi.fn().mockRejectedValue(new TypeError('offline'))
    await expect(createApiClient({ baseUrl: 'https://api.test', fetchImpl: postFetch })
      .request('/sessions', { method: 'POST' })).rejects.toBeInstanceOf(ApiError)
    expect(postFetch).toHaveBeenCalledTimes(1)
  })
})

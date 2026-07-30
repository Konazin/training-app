import { describe, expect, it, vi } from 'vitest'
import type { ExternalExerciseCatalogQuery } from '@training/training-domain'
import { WgerClient, WgerHttpError } from '..'

const query: ExternalExerciseCatalogQuery = {
  page: 2,
  pageSize: 20,
  language: 'pt-br',
  fallbackLanguage: 'en',
  text: 'curl',
  categoryIds: [8],
  muscleIds: [1],
  equipmentIds: [7],
  onlyWithImage: false,
  onlyWithVideo: false,
}

describe('WgerClient', () => {
  it('envia somente filtros do catálogo e interpreta paginação', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({
      count: 42,
      next: 'https://wger.de/api/v2/exerciseinfo/?limit=20&offset=40',
      previous: 'https://wger.de/api/v2/exerciseinfo/?limit=20',
      results: [{ id: 1 }],
    }))
    const page = await new WgerClient({ fetch: fetcher }).search(query)
    const url = new URL(String(fetcher.mock.calls[0]?.[0]))
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '20',
      offset: '20',
      name__search: 'curl',
      category__in: '8',
      muscles__in: '1',
      equipment__in: '7',
    })
    expect(url.toString()).not.toMatch(/ficha|sess|hist|nota|sqlite|device|backup/i)
    expect(page).toMatchObject({ count: 42, results: [{ id: 1 }] })
  })

  it('limita página e rejeita host/protocolo de paginação', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ count: 0, next: null, previous: null, results: [] }))
      .mockResolvedValueOnce(json({
        count: 1, next: 'https://evil.example/api/v2/exerciseinfo/', previous: null, results: [],
      }))
    const client = new WgerClient({ fetch: fetcher })
    await client.search({ ...query, pageSize: 500 })
    expect(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get('limit')).toBe('50')
    await expect(client.search(query)).rejects.toMatchObject({ code: 'INVALID_URL' })
    expect(() => new WgerClient({ baseUrl: 'http://wger.de/api/v2' })).toThrow(WgerHttpError)
  })

  it.each([
    [400, 'HTTP'],
    [404, 'HTTP'],
    [500, 'HTTP'],
  ])('trata HTTP %s', async (status, code) => {
    const client = new WgerClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(json({}, status)) })
    await expect(client.search(query)).rejects.toMatchObject({ code, status })
  })

  it('trata 429 sem retry automático', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, 429, { 'retry-after': '30' }))
    await expect(new WgerClient({ fetch: fetcher }).search(query)).rejects.toMatchObject({
      code: 'RATE_LIMIT', retryAfterSeconds: 30,
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('trata JSON inválido, schema incompleto, resposta vazia e conteúdo não JSON', async () => {
    const cases = [
      response('{', 200),
      json({ count: 1, results: 'no' }),
      response('', 200),
      response('ok', 200, { 'content-type': 'text/plain' }),
    ]
    const expected = ['INVALID_JSON', 'INVALID_SCHEMA', 'INVALID_JSON', 'INVALID_SCHEMA']
    for (const [index, item] of cases.entries()) {
      const client = new WgerClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(item) })
      await expect(client.search(query)).rejects.toMatchObject({ code: expected[index] })
    }
  })

  it('trata offline, timeout e abort explícito', async () => {
    const offline = new WgerClient({ fetch: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network')) })
    await expect(offline.search(query)).rejects.toMatchObject({ code: 'OFFLINE' })

    const pending = vi.fn<typeof fetch>((_, init) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    await expect(new WgerClient({ fetch: pending, timeoutMs: 1 }).search(query))
      .rejects.toMatchObject({ code: 'TIMEOUT' })

    const controller = new AbortController()
    const request = new WgerClient({ fetch: pending }).search(query, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ code: 'ABORTED' })
  })

  it('rejeita respostas grandes', async () => {
    const client = new WgerClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response('{"count":0,"results":[]}', 200, {
        'content-length': '999',
      })),
      maxResponseBytes: 10,
    })
    await expect(client.search(query)).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' })
  })
})

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return response(JSON.stringify(body), status, headers)
}

function response(body: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

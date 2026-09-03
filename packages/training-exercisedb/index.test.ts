import { describe, expect, it, vi } from 'vitest'
import { ExerciseDbClient } from './index'

const query = { page: 1, pageSize: 1, language: 'pt-br', fallbackLanguage: 'en', text: '', categoryIds: [], muscleIds: [], equipmentIds: [], onlyWithImage: false, onlyWithVideo: false }
const row = { exerciseId: 'bench-1', name: 'barbell bench press', targetMuscles: ['pectorals'], secondaryMuscles: ['triceps'], equipments: ['barbell'], instructions: ['Step:1 Press'], gifUrl: 'https://cdn.exercisedb.dev/bench.gif' }
function response(body: unknown): Response { return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }) }

describe('ExerciseDB provider', () => {
  it('mapeia, pagina e preserva provider/externalId/licença', async () => {
    const fetcher = vi.fn(async () => response([row]))
    const page = await new ExerciseDbClient({ fetch: fetcher }).search(query)
    expect(page.items[0]).toMatchObject({ provider: 'EXERCISEDB', externalId: 'bench-1', name: 'barbell bench press', licenseName: expect.any(String) })
    expect(page.items[0]?.media).toEqual([expect.objectContaining({ type: 'IMAGE', mimeType: 'image/gif' })])
    expect(page.items[0]?.media.some((media) => media.type === 'VIDEO')).toBe(false)
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('limit=1'), expect.any(Object))
  })
  it('rejeita schema inválido e respeita cancelamento/timeout', async () => {
    await expect(new ExerciseDbClient({ fetch: async () => response({ nope: true }) }).search(query)).rejects.toThrow('schema inválido')
    const controller = new AbortController(); controller.abort()
    await expect(new ExerciseDbClient({ fetch: async (_url, init) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))) }).search(query, controller.signal)).rejects.toThrow('cancelada')
    await expect(new ExerciseDbClient({ timeoutMs: 1, fetch: async (_url, init) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))) }).search(query)).rejects.toThrow('timeout')
  })

  it('segue os cursores do provider e aplica filtros locais de mídia', async () => {
    const noMedia = { ...row, exerciseId: 'no-media', gifUrl: undefined }
    const second = { ...row, exerciseId: 'page-two', name: 'second page' }
    const fetcher = vi.fn(async (url: RequestInfo | URL) => response(String(url).includes('after=next-page')
      ? { success: true, meta: { total: 2, hasNextPage: false, hasPreviousPage: true, previousCursor: 'first-page' }, data: [second] }
      : { success: true, meta: { total: 2, hasNextPage: true, hasPreviousPage: false, nextCursor: 'next-page' }, data: [noMedia] }))
    const client = new ExerciseDbClient({ fetch: fetcher as unknown as typeof fetch })

    const first = await client.search({ ...query, onlyWithImage: true })
    const pageTwo = await client.search({ ...query, page: 2 })

    expect(first.items).toEqual([])
    expect(pageTwo.items.map((item) => item.externalId)).toEqual(['page-two'])
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      expect.not.stringContaining('offset='),
      expect.stringContaining('after=next-page'),
    ])
  })

  it('does not pretend that the free provider supports name search and unwraps detail responses', async () => {
    const client = new ExerciseDbClient({ fetch: async () => response({ success: true, data: row }) })
    await expect(client.search({ ...query, text: 'bench' })).rejects.toMatchObject({ code: 'UNSUPPORTED_QUERY' })
    await expect(client.findByExternalId('bench-1')).resolves.toMatchObject({ externalId: 'bench-1' })
  })
})

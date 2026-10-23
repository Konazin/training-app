import { describe, expect, it, vi } from 'vitest'
import { ExerciseDbClient } from './index'

const query = { page: 1, pageSize: 1, language: 'pt-br', fallbackLanguage: 'en', text: 'bench press', categoryIds: [], muscleIds: [], equipmentIds: [], onlyWithImage: false, onlyWithVideo: false }
const row = { exerciseId: 'bench-1', name: 'barbell bench press', targetMuscles: ['pectorals'], secondaryMuscles: ['triceps'], equipments: ['barbell'], instructions: ['Step:1 Press'], gifUrl: 'https://cdn.exercisedb.dev/bench.gif' }
function response(body: unknown): Response { return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }) }

describe('ExerciseDB provider', () => {
  it('mapeia, pagina e preserva provider/externalId/licença', async () => {
    const fetcher = vi.fn(async () => response([row]))
    const page = await new ExerciseDbClient({ fetch: fetcher }).search(query)
    expect(page.items[0]).toMatchObject({ provider: 'EXERCISEDB', externalId: 'bench-1', name: 'barbell bench press', licenseName: expect.any(String) })
    expect(page.items[0]?.media).toEqual([expect.objectContaining({ type: 'IMAGE', mimeType: 'image/gif' })])
    expect(page.items[0]?.media.some((media) => media.type === 'VIDEO')).toBe(false)
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('name=bench+press'), expect.any(Object))
  })
  it('rejeita schema inválido e respeita cancelamento/timeout', async () => {
    await expect(new ExerciseDbClient({ fetch: async () => response({ nope: true }) }).search(query)).rejects.toThrow('schema inválido')
    const controller = new AbortController(); controller.abort()
    await expect(new ExerciseDbClient({ fetch: async (_url, init) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))) }).search(query, controller.signal)).rejects.toThrow('cancelada')
    await expect(new ExerciseDbClient({ timeoutMs: 1, fetch: async (_url, init) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))) }).search(query)).rejects.toThrow('timeout')
  })
  it('usa o contrato real da API v1: name, cursor after e metadados em meta', async () => {
    const fetcher = vi.fn(async () => response({ success: true, meta: { total: 87, hasNextPage: true, hasPreviousPage: true, nextCursor: 'next1', previousCursor: 'prev1' }, data: [row] }))
    const client = new ExerciseDbClient({ fetch: fetcher })
    const page = await client.search({ ...query, pageSize: 50, page: 2, cursor: 'abc' })
    const url = new URL(String((fetcher.mock.calls[0] as unknown[])[0]))
    expect(url.searchParams.get('name')).toBe('bench press')
    expect(url.searchParams.get('after')).toBe('abc')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('offset')).toBe(false)
    expect(url.searchParams.get('limit')).toBe('25')
    expect(page).toMatchObject({ total: 87, hasNext: true, hasPrevious: true, nextCursor: 'next1', previousCursor: 'prev1', pageSize: 25, page: 2 })
  })
  it('não promete próxima página quando a API diz que acabou', async () => {
    const fetcher = async () => response({ success: true, meta: { total: 1, hasNextPage: false, hasPreviousPage: false }, data: [row] })
    const page = await new ExerciseDbClient({ fetch: fetcher }).search({ ...query, pageSize: 1 })
    expect(page).toMatchObject({ total: 1, hasNext: false, hasPrevious: false })
    expect(page.nextCursor).toBeUndefined()
  })
  it('lê o detalhe embrulhado em data ao atualizar um importado', async () => {
    const fetcher = async () => response({ success: true, data: row })
    const item = await new ExerciseDbClient({ fetch: fetcher }).findByExternalId('bench-1')
    expect(item).toMatchObject({ provider: 'EXERCISEDB', externalId: 'bench-1' })
  })
  it('trata 404 do detalhe como não encontrado', async () => {
    const fetcher = async () => new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
    await expect(new ExerciseDbClient({ fetch: fetcher }).findByExternalId('gone-1')).resolves.toBeNull()
  })
})

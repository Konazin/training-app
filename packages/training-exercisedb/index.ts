import type { ExternalExerciseCandidate, ExternalExerciseCatalogPage, ExternalExerciseCatalogProvider, ExternalExerciseCatalogQuery, ExternalExerciseMediaCandidate, ExerciseCategory } from '@training/training-domain'

const BASE_URL = 'https://oss.exercisedb.dev/api/v1'
const MAX_PAGE_SIZE = 25
const MAX_RESPONSE_CHARS = 2_000_000
const LICENSE = 'ExerciseDB/AscendAPI hosted catalog'

class HttpStatusError extends Error {
  constructor(readonly status: number) { super(`ExerciseDB HTTP ${status}`) }
}

export interface ExerciseDbClientOptions { baseUrl?: string; timeoutMs?: number; fetch?: typeof fetch }

export class ExerciseDbClient implements ExternalExerciseCatalogProvider {
  readonly descriptor = { id: 'EXERCISEDB' as const, name: 'ExerciseDB' }
  private readonly options: Required<ExerciseDbClientOptions>
  constructor(options: ExerciseDbClientOptions = {}) {
    this.options = { baseUrl: options.baseUrl ?? BASE_URL, timeoutMs: options.timeoutMs ?? 15_000, fetch: options.fetch ?? fetch }
    if (!this.options.baseUrl.startsWith('https://')) throw new Error('ExerciseDB exige HTTPS')
  }
  async search(query: ExternalExerciseCatalogQuery, signal?: AbortSignal): Promise<ExternalExerciseCatalogPage> {
    // A API v1 limita `limit` a 25 e pagina por cursor (`after`); `offset` e `search` são ignorados.
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), MAX_PAGE_SIZE)
    const url = new URL(`${this.options.baseUrl}/exercises`)
    url.searchParams.set('limit', String(pageSize))
    if (query.text.trim()) url.searchParams.set('name', query.text.trim())
    if (query.cursor) url.searchParams.set('after', query.cursor)
    const body = await this.request(url, signal)
    const rows = Array.isArray(body) ? body : object(body) && Array.isArray(body.data) ? body.data : null
    if (!rows || !rows.every((item) => object(item))) throw new Error('ExerciseDB retornou schema inválido')
    const items = rows.map((item) => mapExerciseDb(item)).filter((item): item is ExternalExerciseCandidate => item !== null)
    const meta = object(body) && object(body.meta) ? body.meta : null
    const text = (value: unknown) => typeof value === 'string' && value ? value : undefined
    const nextCursor = text(meta?.nextCursor)
    const previousCursor = text(meta?.previousCursor)
    const hasNext = typeof meta?.hasNextPage === 'boolean' ? meta.hasNextPage && Boolean(nextCursor) : false
    return {
      items,
      page: query.page,
      pageSize,
      total: typeof meta?.total === 'number' ? meta.total : items.length,
      hasNext,
      hasPrevious: typeof meta?.hasPreviousPage === 'boolean' ? meta.hasPreviousPage : query.page > 1,
      ...(hasNext && nextCursor ? { nextCursor } : {}),
      ...(previousCursor ? { previousCursor } : {}),
    }
  }
  async findByExternalId(externalId: string, language = 'en', signal?: AbortSignal) {
    if (!/^[A-Za-z0-9_-]+$/.test(externalId)) return null
    let body: unknown
    try { body = await this.request(new URL(`${this.options.baseUrl}/exercises/${encodeURIComponent(externalId)}`), signal) }
    catch (error) { if (error instanceof HttpStatusError && error.status === 404) return null; throw error }
    const detail = object(body) && object(body.data) ? body.data : object(body) ? body : null
    return mapExerciseDb(detail, language)
  }
  private async request(url: URL, signal?: AbortSignal) {
    if (signal?.aborted) throw new Error('ExerciseDB consulta cancelada')
    const controller = new AbortController(); const abort = () => controller.abort(signal?.reason); signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort('timeout'), this.options.timeoutMs)
    try {
      const response = await this.options.fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal })
      if (response.status === 429) throw new Error('ExerciseDB: limite de consultas atingido. Tente novamente em instantes.')
      if (!response.ok) throw new HttpStatusError(response.status)
      const text = await response.text()
      if (text.length > MAX_RESPONSE_CHARS) throw new Error('ExerciseDB retornou uma resposta grande demais')
      try { return JSON.parse(text) as unknown } catch { throw new Error('ExerciseDB retornou schema inválido') }
    } catch (error) {
      if (signal?.aborted) throw new Error('ExerciseDB consulta cancelada')
      if (controller.signal.aborted) throw new Error('ExerciseDB timeout')
      throw error instanceof Error ? error : new Error('ExerciseDB offline')
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
}

function mapExerciseDb(value: Record<string, unknown> | null, language = 'en'): ExternalExerciseCandidate | null {
  if (!value || typeof value.exerciseId !== 'string' || typeof value.name !== 'string') return null
  const strings = (key: string) => Array.isArray(value[key]) ? value[key].filter((x): x is string => typeof x === 'string') : []
  const primary = strings('targetMuscles'); const secondary = strings('secondaryMuscles'); const equipment = strings('equipments')
  const sourceUrl = `https://exercisedb.dev/exercises/${encodeURIComponent(value.exerciseId)}`
  const gif = typeof value.gifUrl === 'string' ? value.gifUrl : object(value.gifUrls) ? firstUrl(value.gifUrls) : null
  const images = object(value.imageUrls) ? firstUrl(value.imageUrls) : null
  const media: ExternalExerciseMediaCandidate[] = []
  if (gif && secure(gif)) media.push(mediaItem('IMAGE', gif, value.exerciseId, sourceUrl, true, 0))
  if (images && secure(images)) media.push(mediaItem('IMAGE', images, `${value.exerciseId}-image`, sourceUrl, !media.length, media.length))
  const overview = typeof value.overview === 'string' ? value.overview : ''
  return { provider: 'EXERCISEDB', externalId: value.exerciseId, name: value.name, description: overview, primaryMuscleGroup: primary[0] ?? 'Não informado', secondaryMuscleGroups: [...primary.slice(1), ...secondary], equipment: equipment.join(', ') || 'Não informado', category: category(strings('exerciseTypes')), difficulty: typeof value.difficulty === 'string' ? value.difficulty : 'Não informado', instructions: strings('instructions').join('\n'), unilateral: false, timed: false, sourceUrl, licenseName: LICENSE, licenseUrl: 'https://docs.ascendapi.com/products/edb-v1/overview', author: 'AscendAPI', media, warnings: media.length ? [] : ['A fonte não forneceu mídia válida'], language, original: value }
}
function mediaItem(type: 'IMAGE' | 'VIDEO', url: string, id: string, sourceUrl: string, main: boolean, sortOrder: number): ExternalExerciseMediaCandidate { return { type, source: 'EXERCISEDB', externalId: id, remoteUrl: url, thumbnailRemoteUrl: null, mimeType: type === 'IMAGE' ? (url.toLowerCase().includes('.gif') ? 'image/gif' : 'image/*') : 'video/*', width: null, height: null, durationSeconds: null, main, sortOrder, licenseName: LICENSE, licenseUrl: 'https://docs.ascendapi.com/products/edb-v1/overview', author: 'AscendAPI', sourceUrl } }
function firstUrl(value: Record<string, unknown>) { return Object.values(value).find((item): item is string => typeof item === 'string' && item.startsWith('https://')) ?? null }
function secure(value: string) { return value.startsWith('https://') }
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function category(value: string[]): ExerciseCategory { const name = value.join(' ').toLowerCase(); return name.includes('cardio') ? 'CARDIO' : name.includes('stretch') ? 'STRETCHING' : 'STRENGTH' }

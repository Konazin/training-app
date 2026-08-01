import type { ExternalExerciseCandidate, ExternalExerciseCatalogPage, ExternalExerciseCatalogProvider, ExternalExerciseCatalogQuery, ExternalExerciseMediaCandidate, ExerciseCategory } from '@training/training-domain'

const BASE_URL = 'https://oss.exercisedb.dev/api/v1'
const LICENSE = 'ExerciseDB/AscendAPI hosted catalog'

export interface ExerciseDbClientOptions { baseUrl?: string; timeoutMs?: number; fetch?: typeof fetch }

export class ExerciseDbClient implements ExternalExerciseCatalogProvider {
  readonly descriptor = { id: 'EXERCISEDB' as const, name: 'ExerciseDB' }
  private readonly options: Required<ExerciseDbClientOptions>
  constructor(options: ExerciseDbClientOptions = {}) {
    this.options = { baseUrl: options.baseUrl ?? BASE_URL, timeoutMs: options.timeoutMs ?? 15_000, fetch: options.fetch ?? fetch }
    if (!this.options.baseUrl.startsWith('https://')) throw new Error('ExerciseDB exige HTTPS')
  }
  async search(query: ExternalExerciseCatalogQuery, signal?: AbortSignal): Promise<ExternalExerciseCatalogPage> {
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 50)
    const url = new URL(`${this.options.baseUrl}/exercises`)
    url.searchParams.set('limit', String(pageSize)); url.searchParams.set('offset', String((query.page - 1) * pageSize))
    if (query.text.trim()) url.searchParams.set('search', query.text.trim())
    const body = await this.request(url, signal)
    const rows = Array.isArray(body) ? body : object(body) && Array.isArray(body.data) ? body.data : null
    if (!rows || !rows.every((item) => object(item))) throw new Error('ExerciseDB retornou schema inválido')
    const items = rows.map((item) => mapExerciseDb(item)).filter((item): item is ExternalExerciseCandidate => item !== null)
    return { items, page: query.page, pageSize, total: object(body) && typeof body.total === 'number' ? body.total : items.length, hasNext: items.length === pageSize, hasPrevious: query.page > 1 }
  }
  async findByExternalId(externalId: string, language = 'en', signal?: AbortSignal) {
    if (!/^[A-Za-z0-9_-]+$/.test(externalId)) return null
    const body = await this.request(new URL(`${this.options.baseUrl}/exercises/${encodeURIComponent(externalId)}`), signal)
    return mapExerciseDb(object(body) ? body : null, language)
  }
  private async request(url: URL, signal?: AbortSignal) {
    if (signal?.aborted) throw new Error('ExerciseDB consulta cancelada')
    const controller = new AbortController(); const abort = () => controller.abort(signal?.reason); signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort('timeout'), this.options.timeoutMs)
    try {
      const response = await this.options.fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal })
      if (!response.ok) throw new Error(`ExerciseDB HTTP ${response.status}`)
      const body: unknown = await response.json()
      return body
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
  if (gif && secure(gif)) media.push(mediaItem('VIDEO', gif, value.exerciseId, sourceUrl))
  if (images && secure(images)) media.push(mediaItem('IMAGE', images, `${value.exerciseId}-image`, sourceUrl))
  const overview = typeof value.overview === 'string' ? value.overview : ''
  return { provider: 'EXERCISEDB', externalId: value.exerciseId, name: value.name, description: overview, primaryMuscleGroup: primary[0] ?? 'Não informado', secondaryMuscleGroups: secondary, equipment: equipment.join(', ') || 'Não informado', category: category(strings('exerciseTypes')), difficulty: typeof value.difficulty === 'string' ? value.difficulty : 'Não informado', instructions: strings('instructions').join('\n'), unilateral: false, timed: false, sourceUrl, licenseName: LICENSE, licenseUrl: 'https://docs.ascendapi.com/products/edb-v1/overview', author: 'AscendAPI', media, warnings: media.length ? [] : ['A fonte não forneceu mídia válida'], language, original: value }
}
function mediaItem(type: 'IMAGE' | 'VIDEO', url: string, id: string, sourceUrl: string): ExternalExerciseMediaCandidate { return { type, source: 'EXERCISEDB', externalId: id, remoteUrl: url, thumbnailRemoteUrl: null, mimeType: type === 'IMAGE' ? 'image/*' : 'image/gif', width: null, height: null, durationSeconds: null, main: true, sortOrder: 0, licenseName: LICENSE, licenseUrl: 'https://docs.ascendapi.com/products/edb-v1/overview', author: 'AscendAPI', sourceUrl } }
function firstUrl(value: Record<string, unknown>) { return Object.values(value).find((item): item is string => typeof item === 'string' && item.startsWith('https://')) ?? null }
function secure(value: string) { return value.startsWith('https://') }
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function category(value: string[]): ExerciseCategory { const name = value.join(' ').toLowerCase(); return name.includes('cardio') ? 'CARDIO' : name.includes('stretch') ? 'STRETCHING' : 'STRENGTH' }

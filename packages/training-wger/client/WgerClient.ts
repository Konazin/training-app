import type { ExternalExerciseCatalogQuery } from '@training/training-domain'
import { WgerHttpError } from './WgerHttpError'
import type { WgerClientOptions, WgerLanguage, WgerLanguageOption, WgerLicense, WgerMetadata, WgerPage } from './types'

const DEFAULT_BASE_URL = 'https://wger.de/api/v2'
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_PAGE_SIZE = 50
const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000

export class WgerClient {
  private readonly baseUrl: URL
  private readonly timeoutMs: number
  private readonly maxPageSize: number
  private readonly maxResponseBytes: number
  private readonly fetcher: typeof fetch
  private metadata?: WgerMetadata
  private languageOptions?: WgerLanguageOption[]

  constructor(options: WgerClientOptions = {}) {
    this.baseUrl = validateBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxPageSize = options.maxPageSize ?? DEFAULT_MAX_PAGE_SIZE
    this.maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
    this.fetcher = options.fetch ?? fetch
  }

  async search(query: ExternalExerciseCatalogQuery, signal?: AbortSignal): Promise<WgerPage> {
    const page = positiveInteger(query.page, 1)
    const limit = Math.min(positiveInteger(query.pageSize, 20), this.maxPageSize)
    const url = this.url('/exerciseinfo/')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String((page - 1) * limit))
    if (query.text.trim()) url.searchParams.set('name__search', query.text.trim())
    addCsv(url, 'category__in', query.categoryIds)
    addCsv(url, 'muscles__in', query.muscleIds)
    addCsv(url, 'equipment__in', query.equipmentIds)
    return parsePage(await this.request(url, signal, query.language))
  }

  async findByExternalId(externalId: string, language = 'pt-br', signal?: AbortSignal): Promise<unknown | null> {
    if (!/^\d+$/.test(externalId)) return null
    try {
      return await this.request(this.url(`/exerciseinfo/${externalId}/`), signal, language)
    } catch (error) {
      if (error instanceof WgerHttpError && error.status === 404) return null
      throw error
    }
  }

  async getMetadata(signal?: AbortSignal): Promise<WgerMetadata> {
    if (this.metadata) return this.metadata
    const [languagePage, licensePage] = await Promise.all([
      this.request(this.url('/language/?limit=100'), signal),
      this.request(this.url('/license/?limit=100'), signal),
    ])
    const languages = parseList<WgerLanguage>(languagePage, isLanguage)
    this.languageOptions = languages.map((item) => ({
      code: normalizeLanguage(item.short_name),
      name: item.full_name || item.full_name_en || item.short_name,
    }))
    this.metadata = {
      languages: new Map(languages.map((item) => [
        item.id, normalizeLanguage(item.short_name),
      ])),
      licenses: new Map(parseList<WgerLicense>(licensePage, isLicense).map((item) => [item.id, item])),
    }
    return this.metadata
  }

  async getLanguages(signal?: AbortSignal): Promise<WgerLanguageOption[]> {
    await this.getMetadata(signal)
    return [...this.languageOptions ?? []]
  }

  private url(path: string) {
    return assertWgerUrl(new URL(`.${path}`, `${this.baseUrl.toString().replace(/\/?$/, '/')}`))
  }

  private async request(url: URL, externalSignal?: AbortSignal, language?: string): Promise<unknown> {
    assertWgerUrl(url)
    const controller = new AbortController()
    const abort = () => controller.abort(externalSignal?.reason)
    externalSignal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort('timeout'), this.timeoutMs)
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      const acceptedLanguage = language?.trim().toLowerCase().replaceAll('_', '-')
      if (acceptedLanguage && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(acceptedLanguage)) {
        headers['Accept-Language'] = acceptedLanguage
      }
      const response = await this.fetcher(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      if (!response.ok) throw httpError(response)
      if (!contentType.includes('application/json')) {
        throw new WgerHttpError('INVALID_SCHEMA', 'O Wger retornou um formato que não é JSON.')
      }
      const declaredSize = Number(response.headers.get('content-length') ?? 0)
      if (declaredSize > this.maxResponseBytes) {
        throw new WgerHttpError('RESPONSE_TOO_LARGE', 'A resposta do Wger excedeu o limite seguro.')
      }
      const body = await response.text()
      if (new TextEncoder().encode(body).byteLength > this.maxResponseBytes) {
        throw new WgerHttpError('RESPONSE_TOO_LARGE', 'A resposta do Wger excedeu o limite seguro.')
      }
      try {
        return JSON.parse(body) as unknown
      } catch {
        throw new WgerHttpError('INVALID_JSON', 'O Wger retornou JSON inválido.')
      }
    } catch (error) {
      if (error instanceof WgerHttpError) throw error
      if (controller.signal.aborted) {
        if (externalSignal?.aborted) throw new WgerHttpError('ABORTED', 'Consulta cancelada.')
        throw new WgerHttpError('TIMEOUT', 'O Wger demorou mais que o limite de tempo.')
      }
      throw new WgerHttpError('OFFLINE', 'Sem conexão com o Wger. Confira a internet e tente novamente.')
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', abort)
    }
  }
}

export function assertWgerUrl(url: URL) {
  if (url.protocol !== 'https:' || url.hostname !== 'wger.de' || !url.pathname.startsWith('/api/v2/')) {
    throw new WgerHttpError('INVALID_URL', 'Somente URLs HTTPS da API wger.de são permitidas.')
  }
  return url
}

function validateBaseUrl(value: string) {
  try {
    return assertWgerUrl(new URL(value.endsWith('/') ? value : `${value}/`))
  } catch (error) {
    if (error instanceof WgerHttpError) throw error
    throw new WgerHttpError('INVALID_URL', 'URL base do Wger inválida.')
  }
}

function httpError(response: Response) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after')
    const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined
    return new WgerHttpError(
      'RATE_LIMIT',
      seconds ? `Limite do Wger atingido. Tente novamente em cerca de ${seconds}s.` : 'Limite do Wger atingido. Tente novamente mais tarde.',
      429,
      seconds,
    )
  }
  const message = response.status >= 500
    ? 'O Wger está indisponível no momento.'
    : `O Wger recusou a consulta (HTTP ${response.status}).`
  return new WgerHttpError('HTTP', message, response.status)
}

function parsePage(value: unknown): WgerPage {
  if (!isObject(value) || typeof value.count !== 'number' || !Number.isInteger(value.count)
    || value.count < 0 || !Array.isArray(value.results)) {
    throw new WgerHttpError('INVALID_SCHEMA', 'A resposta do Wger não tem o formato de catálogo esperado.')
  }
  const next = optionalUrl(value.next)
  const previous = optionalUrl(value.previous)
  if (next) assertWgerUrl(new URL(next))
  if (previous) assertWgerUrl(new URL(previous))
  return { count: value.count, next, previous, results: value.results }
}

function parseList<T>(value: unknown, predicate: (item: unknown) => item is T) {
  const page = parsePage(value)
  if (!page.results.every(predicate)) throw new WgerHttpError('INVALID_SCHEMA', 'Metadados Wger incompatíveis.')
  return page.results
}

function isLanguage(value: unknown): value is WgerLanguage {
  return isObject(value) && Number.isInteger(value.id) && typeof value.short_name === 'string'
}

function isLicense(value: unknown): value is WgerLicense {
  return isObject(value) && Number.isInteger(value.id) && typeof value.full_name === 'string'
    && typeof value.short_name === 'string' && (typeof value.url === 'string' || value.url === null)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalUrl(value: unknown) {
  if (value == null) return null
  if (typeof value !== 'string') throw new WgerHttpError('INVALID_SCHEMA', 'URL de paginação inválida.')
  return value
}

function positiveInteger(value: number, fallback: number) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function addCsv(url: URL, key: string, values: number[]) {
  const safe = values.filter((value) => Number.isInteger(value) && value > 0)
  if (safe.length) url.searchParams.set(key, safe.join(','))
}

function normalizeLanguage(value: string) {
  return value.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-')
}

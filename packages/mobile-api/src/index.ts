export interface ApiErrorBody {
  message?: string
  fields?: Record<string, string>
}

export type ApiErrorKind = 'CONFIGURATION' | 'NETWORK' | 'TIMEOUT' | 'CANCELLED' | 'HTTP'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly fields: Record<string, string> = {},
    readonly kind: ApiErrorKind = 'HTTP',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiClient {
  request<T>(path: string, options?: RequestInit): Promise<T>
}

export interface ApiClientOptions {
  baseUrl: string
  accessToken?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  retryGet?: number
}

export function createApiClient({
  baseUrl,
  accessToken,
  timeoutMs = 12_000,
  fetchImpl = fetch,
  retryGet = 1,
}: ApiClientOptions): ApiClient {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '')

  return {
    async request<T>(path: string, options: RequestInit = {}) {
      if (!normalizedBaseUrl) throw new ApiError('Endereço da API não configurado.', 0, {}, 'CONFIGURATION')
      const method = (options.method ?? 'GET').toUpperCase()
      const attempts = method === 'GET' ? Math.max(0, retryGet) + 1 : 1
      let lastError: unknown
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          return await execute<T>(fetchImpl, `${normalizedBaseUrl}${path}`, accessToken, timeoutMs, options)
        } catch (error) {
          lastError = error
          if (attempt + 1 >= attempts || !retryable(error)) throw error
        }
      }
      throw lastError
    },
  }
}

async function execute<T>(
  fetchImpl: typeof fetch,
  url: string,
  accessToken: string | undefined,
  timeoutMs: number,
  options: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, Math.max(1, timeoutMs))
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody
      const fieldMessage = body.fields ? Object.values(body.fields)[0] : undefined
      throw new ApiError(fieldMessage ?? body.message ?? 'Não foi possível concluir a operação.',
        response.status, body.fields, 'HTTP')
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (timedOut) throw new ApiError('A API demorou demais para responder.', 0, {}, 'TIMEOUT')
    if (options.signal?.aborted) throw new ApiError('Operação cancelada.', 0, {}, 'CANCELLED')
    throw new ApiError('Não foi possível conectar à API.', 0, {}, 'NETWORK')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

function retryable(error: unknown) {
  return error instanceof ApiError
    && (error.kind === 'NETWORK' || (error.kind === 'HTTP' && [502, 503, 504].includes(error.status)))
}

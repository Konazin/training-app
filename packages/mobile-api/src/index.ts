export interface ApiErrorBody {
  message?: string
  fields?: Record<string, string>
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiClient {
  request<T>(path: string, options?: RequestInit): Promise<T>
}

export function createApiClient({ baseUrl }: { baseUrl: string }): ApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
  return {
    async request<T>(path: string, options?: RequestInit) {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody
        const fieldMessage = body.fields ? Object.values(body.fields)[0] : undefined
        throw new ApiError(
          fieldMessage ?? body.message ?? 'Não foi possível concluir a operação.',
          response.status,
          body.fields,
        )
      }
      if (response.status === 204) return undefined as T
      return response.json() as Promise<T>
    },
  }
}

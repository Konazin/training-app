import { API_URL } from '../../config/api'

interface ApiErrorBody {
  message?: string
  fields?: Record<string, string>
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const fieldMessage = body.fields ? Object.values(body.fields)[0] : undefined
    throw new Error(fieldMessage ?? body.message ?? 'Não foi possível concluir a operação.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

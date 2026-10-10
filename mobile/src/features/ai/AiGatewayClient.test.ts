import { describe, expect, it, vi } from 'vitest'
import { AiGatewayClient, AI_PRIVACY_NOTICE } from './AiGatewayClient'

describe('AiGatewayClient', () => {
  it('does not make a request when no optional gateway URL exists', async () => {
    const request = vi.fn()
    await expect(new AiGatewayClient(null, request).parseMeal({ text: '2 ovos e 150g de arroz', context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [] } })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(request).not.toHaveBeenCalled()
  })

  it('validates the gateway draft before returning it', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ draft: { items: [{ query: 'ovos', quantity: 2, unit: 'unit' }] } }), { status: 200 }))
    await expect(new AiGatewayClient('https://gateway.example', request).parseMeal({ text: '2 ovos', context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [] } })).resolves.toEqual({ items: [{ query: 'ovos', quantity: 2, unit: 'unit' }] })
  })

  it('contains the required privacy disclosure without storing a provider key', () => {
    expect(AI_PRIVACY_NOTICE).toContain('Free Tier')
  })

  it('uses the longer vision timeout and classifies gateway failures', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ draft: { items: [{ query: 'frango', quantity: 200, unit: 'g', confidence: 0.9, estimated: true }], uncertainties: [] } }), { status: 200 }))
    const input = { image: { base64: 'aGVsbG8=', mimeType: 'image/jpeg' as const }, context: { locale: 'pt-BR' as const, foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [], userHint: 'o frango tem 200g' } }
    await expect(new AiGatewayClient('https://gateway.example', request).analyzeMealImage(input)).resolves.toMatchObject({ items: [{ query: 'frango' }] })

    const invalid = vi.fn(async () => new Response(JSON.stringify({ draft: { items: [{ query: 'frango' }], uncertainties: [] } }), { status: 200 }))
    await expect(new AiGatewayClient('https://gateway.example', invalid).analyzeMealImage(input)).rejects.toMatchObject({ code: 'SCHEMA_ERROR', message: 'A IA respondeu, mas não foi possível interpretar a análise.' })

    const rateLimited = vi.fn(async () => new Response('{}', { status: 429 }))
    await expect(new AiGatewayClient('https://gateway.example', rateLimited).analyzeMealImage(input)).rejects.toMatchObject({ code: 'RATE_LIMITED', message: 'O limite temporário da IA foi atingido.' })
  })

  it('reports a vision timeout separately from a network error', async () => {
    const pending = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })))
    await expect(new AiGatewayClient('https://gateway.example', pending, 1).analyzeMealImage({ image: { base64: 'aGVsbG8=', mimeType: 'image/jpeg' }, context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [], userHint: null } })).rejects.toMatchObject({ code: 'TIMEOUT', message: 'A análise da imagem demorou mais do que o esperado.' })
    const network = vi.fn(async () => { throw new TypeError('offline') })
    await expect(new AiGatewayClient('https://gateway.example', network).analyzeMealImage({ image: { base64: 'aGVsbG8=', mimeType: 'image/jpeg' }, context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [], userHint: null } })).rejects.toMatchObject({ code: 'NETWORK_ERROR', message: 'Não foi possível acessar o serviço de IA.' })
  })

  it('times out task body parsing without swallowing the timeout as an empty body', async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
    }) as unknown as Response)
    await expect(new AiGatewayClient('https://gateway.example', request, 1).parseMeal({ text: '2 ovos', context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [] } })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('times out status body parsing', async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
    }) as unknown as Response)
    await expect(new AiGatewayClient('https://gateway.example', request, 1).getStatus()).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
})

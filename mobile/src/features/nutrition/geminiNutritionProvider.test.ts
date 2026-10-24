import { describe, expect, it, vi } from 'vitest'
import { createGeminiNutritionProvider, GEMINI_MODEL_CHAIN, GEMINI_NUTRITION_MODEL } from './geminiNutritionProvider'

const mealJson = {
  title: 'Prato de teste',
  items: [{
    name: 'Arroz', portionDescription: '1 porção', estimatedGrams: 150,
    caloriesKcal: 190, proteinGrams: 4, carbohydratesGrams: 42,
    fatGrams: 0.5, fiberGrams: 1, confidence: 0.7,
  }],
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
}), { status, headers: { 'Content-Type': 'application/json' } })

describe('Gemini nutrition provider', () => {
  it('sends an image only to the official endpoint with a JSON response request', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response(mealJson))
    const provider = createGeminiNutritionProvider('user-key', fetchMock)
    const result = await provider.estimateMeal({ base64: 'cGhvdG8=', mimeType: 'image/jpeg' })

    expect(result.title).toBe('Prato de teste')
    expect(result.items[0]).toMatchObject({ dataSource: 'AI_ESTIMATE', confidence: 0.7, caloriesKcal: 190 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain(GEMINI_NUTRITION_MODEL)
    expect(String(url)).not.toContain('user-key')
    expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('user-key')
    const body = JSON.parse(String(init?.body)) as {
      contents: { parts: Record<string, unknown>[] }[]
      generationConfig: { responseMimeType: string }
    }
    expect(body.contents[0]?.parts[1]).toEqual({
      inlineData: { mimeType: 'image/jpeg', data: 'cGhvdG8=' },
    })
    expect(body.generationConfig.responseMimeType).toBe('application/json')
  })

  it('rejects unsupported, oversized, and empty-key requests before network access', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response(mealJson))
    expect(() => createGeminiNutritionProvider('  ')).toThrow('Configure')
    const provider = createGeminiNutritionProvider('user-key', fetchMock)
    await expect(provider.estimateMeal({ base64: 'photo', mimeType: 'image/gif' as never })).rejects.toThrow('Formato')
    await expect(provider.estimateMeal({ base64: 'x'.repeat(12 * 1024 * 1024 + 1), mimeType: 'image/jpeg' })).rejects.toThrow('9 MB')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validates model output and maps quota errors without exposing provider details', async () => {
    const malformed = createGeminiNutritionProvider('key', vi.fn(async () => response({ ...mealJson, items: [{ ...mealJson.items[0], caloriesKcal: -10 }] })))
    await expect(malformed.estimateMeal({ base64: 'photo', mimeType: 'image/jpeg' })).rejects.toThrow('resposta incompatível')

    const limited = createGeminiNutritionProvider('key', vi.fn(async () => new Response('sensitive provider body', { status: 429 })))
    await expect(limited.suggestDailyMenu({
      goals: { caloriesKcal: null, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null },
      preferences: '',
    })).rejects.toThrow('cota gratuita')
  })

  it('returns an editable one-day suggestion from structured JSON', async () => {
    const suggestion = {
      title: 'Menu de exemplo', summary: 'Sugestão aproximada.',
      meals: [{ mealType: 'LUNCH', title: 'Almoço', items: mealJson.items }],
    }
    const provider = createGeminiNutritionProvider('key', vi.fn(async () => response(suggestion)))
    const result = await provider.suggestDailyMenu({
      goals: { caloriesKcal: 2000, proteinGrams: null, carbohydratesGrams: null, fatGrams: null, fiberGrams: null },
      preferences: 'vegetariano',
    })
    expect(result.title).toBe('Menu de exemplo')
    expect(result.meals[0]?.items[0]?.dataSource).toBe('AI_ESTIMATE')
  })

  describe('model fallback', () => {
    const image = { base64: 'photo', mimeType: 'image/jpeg' as const }
    const chain = [
      { model: 'fast', timeoutMs: 20 },
      { model: 'mid', timeoutMs: 40 },
      { model: 'slow', timeoutMs: 60 },
    ]
    const modelOf = (url: RequestInfo | URL) => /models\/([^:]+):/.exec(String(url))![1]!
    const hang = (init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    })

    it('starts with the fastest model and keeps slower ones as later fallbacks with longer timeouts', () => {
      expect(GEMINI_NUTRITION_MODEL).toBe('gemini-3.5-flash-lite')
      expect(GEMINI_MODEL_CHAIN[0]?.model).toBe(GEMINI_NUTRITION_MODEL)
      const timeouts = GEMINI_MODEL_CHAIN.map((entry) => entry.timeoutMs)
      expect(timeouts).toEqual([...timeouts].sort((a, b) => a - b))
      expect(new Set(GEMINI_MODEL_CHAIN.map((entry) => entry.model)).size).toBe(GEMINI_MODEL_CHAIN.length)
    })

    it('falls back to the next model on 503 and on timeout', async () => {
      const tried: string[] = []
      const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        tried.push(modelOf(url))
        if (tried.length === 1) return new Response('busy', { status: 503 })
        if (tried.length === 2) return hang(init)
        return response(mealJson)
      })
      const provider = createGeminiNutritionProvider('key', fetchMock, chain)
      const result = await provider.estimateMeal(image)
      expect(result.title).toBe('Prato de teste')
      expect(tried).toEqual(['fast', 'mid', 'slow'])
    })

    it('falls back on 429, 404 and network failures', async () => {
      const statuses = [429, 404] as const
      let call = 0
      const fetchMock = vi.fn(async () => {
        call += 1
        if (call <= 2) return new Response('', { status: statuses[call - 1]! })
        if (call === 3) throw new TypeError('Network request failed')
        return response(mealJson)
      })
      const provider = createGeminiNutritionProvider('key', fetchMock, [...chain, { model: 'last', timeoutMs: 60 }])
      await expect(provider.estimateMeal(image)).resolves.toMatchObject({ title: 'Prato de teste' })
      expect(call).toBe(4)
    })

    it('does not fall back when the key is rejected or the request is invalid', async () => {
      for (const status of [400, 401, 403]) {
        const fetchMock = vi.fn(async () => new Response('', { status }))
        const provider = createGeminiNutritionProvider('key', fetchMock, chain)
        await expect(provider.estimateMeal(image)).rejects.toThrow()
        expect(fetchMock).toHaveBeenCalledTimes(1)
      }
    })

    it('reports that the service is busy only after every model failed', async () => {
      const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => hang(init))
      const provider = createGeminiNutritionProvider('key', fetchMock, chain)
      await expect(provider.estimateMeal(image)).rejects.toThrow('demorou demais')
      expect(fetchMock).toHaveBeenCalledTimes(3)

      const busy = vi.fn(async () => new Response('', { status: 503 }))
      await expect(createGeminiNutritionProvider('key', busy, chain).estimateMeal(image)).rejects.toThrow('temporariamente indisponível')
      expect(busy).toHaveBeenCalledTimes(3)
    })

    it('falls back when a model answers with unusable output, and reports it if all do', async () => {
      const tried: string[] = []
      const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
        tried.push(modelOf(url))
        return tried.length === 1
          ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"title":' }] } }] }), { status: 200 })
          : response(mealJson)
      })
      await expect(createGeminiNutritionProvider('key', fetchMock, chain).estimateMeal(image)).resolves.toMatchObject({ title: 'Prato de teste' })
      expect(tried).toEqual(['fast', 'mid'])

      const bad = vi.fn(async () => response({ ...mealJson, items: [] }))
      await expect(createGeminiNutritionProvider('key', bad, chain).estimateMeal(image)).rejects.toThrow('resposta incompatível')
      expect(bad).toHaveBeenCalledTimes(3)
    })

    it('reports a user cancel as cancelled even while the response body is being read', async () => {
      const controller = new AbortController()
      const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = new Promise<string>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
        })
        return { ok: true, status: 200, json: () => body.then(JSON.parse) } as unknown as Response
      })
      const pending = createGeminiNutritionProvider('key', fetchMock, chain).estimateMeal(image, controller.signal)
      setTimeout(() => controller.abort(), 5)
      await expect(pending).rejects.toThrow('cancelada')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('leaves room for thinking tokens in the output limit', async () => {
      const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response(mealJson))
      await createGeminiNutritionProvider('key', fetchMock, chain).estimateMeal(image)
      const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)) as { generationConfig: { maxOutputTokens: number } }
      expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192)
    })

    it('stops immediately without trying other models when the user cancels', async () => {
      const controller = new AbortController()
      const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => hang(init))
      const provider = createGeminiNutritionProvider('key', fetchMock, [{ model: 'fast', timeoutMs: 1000 }, ...chain])
      const pending = provider.estimateMeal(image, controller.signal)
      setTimeout(() => controller.abort(), 5)
      await expect(pending).rejects.toThrow('cancelada')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})

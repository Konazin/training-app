import { describe, expect, it, vi } from 'vitest'
import { createGeminiNutritionProvider, GEMINI_NUTRITION_MODEL } from './geminiNutritionProvider'

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
})

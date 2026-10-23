import {
  validateNutritionItem,
  type NutritionAiDietRequest,
  type NutritionAiDietSuggestion,
  type NutritionAiMealEstimate,
  type NutritionAiProvider,
  type NutritionImageInput,
  type NutritionMealItemInput,
  type NutritionMealType,
} from '@training/training-domain'

export type GeminiModelAttempt = { model: string; timeoutMs: number }
// Do mais rápido ao mais lento; modelos maiores ganham mais tempo antes do timeout.
// Medido em 2026-10: 3.5-flash-lite ~2 s, 3.6-flash ~8 s, 3.8-flash instável/sobrecarregado.
export const GEMINI_MODEL_CHAIN: readonly GeminiModelAttempt[] = [
  { model: 'gemini-3.5-flash-lite', timeoutMs: 30_000 },
  { model: 'gemini-3.6-flash', timeoutMs: 60_000 },
  { model: 'gemini-3.8-flash', timeoutMs: 90_000 },
]
export const GEMINI_NUTRITION_MODEL = GEMINI_MODEL_CHAIN[0]!.model
const GEMINI_ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
const MAX_IMAGE_BASE64_CHARS = 12 * 1024 * 1024
const mealTypes: NutritionMealType[] = [
  'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER',
]

type FetchLike = typeof fetch

export function createGeminiNutritionProvider(
  apiKey: string,
  fetchImpl: FetchLike = fetch,
  chain: readonly GeminiModelAttempt[] = GEMINI_MODEL_CHAIN,
): NutritionAiProvider {
  const key = apiKey.trim()
  if (!key || key.length > 512 || /\s/.test(key)) {
    throw new Error('Configure uma chave Gemini válida antes de continuar.')
  }
  return {
    estimateMeal: async (image, signal) => {
      validateImage(image)
      const response = await generate(fetchImpl, chain, key, imagePrompt(), image, signal)
      const title = requiredString(response.title, 'title', 100)
      const items = parseItems(response.items)
      if (!items.length) throw invalidResponse()
      return { title, items }
    },
    suggestDailyMenu: async (input, signal) => {
      const preferences = input.preferences.trim()
      if (preferences.length > 500) throw new Error('As preferências devem ter no máximo 500 caracteres.')
      const prompt = dietPrompt(input, preferences)
      const response = await generate(fetchImpl, chain, key, prompt, undefined, signal)
      const title = requiredString(response.title, 'title', 100)
      const summary = requiredString(response.summary, 'summary', 500)
      if (!Array.isArray(response.meals) || response.meals.length < 1 || response.meals.length > 8) {
        throw invalidResponse()
      }
      return {
        title,
        summary,
        meals: response.meals.map((value, index) => {
          const meal = object(value)
          if (!mealTypes.includes(meal.mealType as NutritionMealType)) throw invalidResponse()
          const items = parseItems(meal.items)
          if (!items.length) throw invalidResponse()
          return {
            mealType: meal.mealType as NutritionMealType,
            title: requiredString(meal.title, `meals[${index}].title`, 100),
            items,
          }
        }),
      }
    },
  }
}

class RetryableError extends Error {}

async function generate(
  fetchImpl: FetchLike,
  chain: readonly GeminiModelAttempt[],
  apiKey: string,
  prompt: string,
  image?: NutritionImageInput,
  signal?: AbortSignal,
) {
  const parts: Record<string, unknown>[] = [{ text: prompt }]
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } })
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096 },
  })
  let lastError: Error = new Error('Não foi possível conectar ao Gemini. Confira a internet e tente novamente.')
  for (const attempt of chain) {
    if (signal?.aborted) throw new Error('Análise cancelada.')
    try {
      return await generateWithModel(fetchImpl, attempt, apiKey, body, signal)
    } catch (error) {
      if (!(error instanceof RetryableError)) throw error
      lastError = error
    }
  }
  throw lastError
}

async function generateWithModel(
  fetchImpl: FetchLike,
  { model, timeoutMs }: GeminiModelAttempt,
  apiKey: string,
  body: string,
  signal?: AbortSignal,
) {
  const controller = new AbortController()
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    let response: Response
    try {
      response = await fetchImpl(GEMINI_ENDPOINT(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw new Error('Análise cancelada.')
      if (timedOut) throw new RetryableError('A análise demorou demais e foi interrompida (conexão lenta ou serviço ocupado). Tente de novo ou registre manualmente.')
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Análise cancelada.')
      throw new RetryableError('Não foi possível conectar ao Gemini. Confira a internet e tente novamente.')
    }
    if (!response.ok) {
      const failure = providerError(response.status)
      throw isRetryableStatus(response.status) ? new RetryableError(failure.message) : failure
    }
    return await readResponse(response)
  } catch (error) {
    // O timeout também vale enquanto o corpo da resposta é lido.
    if (timedOut && !(error instanceof RetryableError) && !signal?.aborted) {
      throw new RetryableError('A análise demorou demais e foi interrompida (conexão lenta ou serviço ocupado). Tente de novo ou registre manualmente.')
    }
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

function isRetryableStatus(status: number) {
  return status === 404 || status === 429 || status >= 500
}

async function readResponse(response: Response) {
  let body: unknown
  try { body = await response.json() } catch { throw invalidResponse() }
  const root = object(body)
  const candidates = Array.isArray(root.candidates) ? root.candidates : []
  const first = candidates.length ? object(candidates[0]) : null
  const content = first && first.content ? object(first.content) : null
  const responseParts = content && Array.isArray(content.parts) ? content.parts : []
  const text = responseParts.map((part) => object(part).text).find((part) => typeof part === 'string')
  if (typeof text !== 'string') throw invalidResponse()
  try {
    return object(JSON.parse(stripFence(text)))
  } catch {
    throw invalidResponse()
  }
}

function imagePrompt() {
  return [
    'Estimate the visible foods and edible portions in this meal photo.',
    'Return only JSON with title and items. Each item needs name, portionDescription, estimatedGrams, caloriesKcal, proteinGrams, carbohydratesGrams, fatGrams, fiberGrams, and confidence (0 to 1).',
    'Use approximate values, clearly prefer a conservative estimate, and do not claim medical or exact measurement. If a food or portion is uncertain, lower confidence.',
    'Do not include micronutrients unless reliable; the app will leave them empty.',
  ].join(' ')
}

function dietPrompt(input: NutritionAiDietRequest, preferences: string) {
  const goals = Object.fromEntries(Object.entries(input.goals).filter(([, value]) => value !== null))
  return [
    'Create one generic, editable sample-day menu for an adult. This is an idea, not a prescription or medical advice.',
    'Do not diagnose, recommend supplements, make weight-loss claims, or give medical advice. If the request mentions a medical condition, say the user should consult a qualified professional and provide no condition-specific plan.',
    'Return only JSON with title, summary, and meals. Include 3 to 6 meals. Each meal needs mealType (BREAKFAST, MORNING_SNACK, LUNCH, AFTERNOON_SNACK, DINNER, SUPPER, or OTHER), title, and items. Each item needs name, portionDescription, estimatedGrams, caloriesKcal, proteinGrams, carbohydratesGrams, fatGrams, fiberGrams, and confidence (0 to 1).',
    'Use only the user-entered preferences and goals below. Do not infer age, sex, health status, activity, or body measurements. Values are approximate.',
    `User-entered goals: ${JSON.stringify(goals)}.`,
    `User-entered food preferences: ${preferences || 'none provided'}.`,
  ].join('\n')
}

function validateImage(image: NutritionImageInput) {
  if (!image.base64 || image.base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error('A imagem está vazia ou excede o limite de 9 MB. Escolha uma imagem menor.')
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
    throw new Error('Formato não compatível. Use JPEG, PNG ou WebP.')
  }
}

function parseItems(value: unknown): NutritionMealItemInput[] {
  if (!Array.isArray(value) || value.length > 30) throw invalidResponse()
  return value.map((value, index) => {
    const item = object(value)
    const numeric = (key: string) => {
      const number = item[key]
      if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) throw invalidResponse()
      return number
    }
    const grams = item.estimatedGrams
    if (grams !== null && (typeof grams !== 'number' || !Number.isFinite(grams) || grams < 0)) throw invalidResponse()
    const confidence = item.confidence
    if (confidence !== null && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw invalidResponse()
    try {
      return validateNutritionItem({
        name: requiredString(item.name, `items[${index}].name`, 100),
        portionDescription: typeof item.portionDescription === 'string' ? item.portionDescription.slice(0, 120) : '',
        estimatedGrams: grams as number | null,
        caloriesKcal: numeric('caloriesKcal'),
        proteinGrams: numeric('proteinGrams'),
        carbohydratesGrams: numeric('carbohydratesGrams'),
        fatGrams: numeric('fatGrams'),
        fiberGrams: numeric('fiberGrams'),
        micronutrients: {},
        confidence: confidence as number | null,
        dataSource: 'AI_ESTIMATE',
        sortOrder: index,
      })
    } catch {
      throw invalidResponse()
    }
  })
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidResponse()
  return value as Record<string, unknown>
}

function requiredString(value: unknown, key: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw invalidResponse()
  return value.trim()
}

function stripFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}

function providerError(status: number) {
  if (status === 401 || status === 403) return new Error('Chave Gemini inválida ou sem acesso à API.')
  if (status === 429) return new Error('A cota gratuita do Gemini foi atingida. Tente novamente mais tarde.')
  if (status === 413) return new Error('A imagem excede o tamanho aceito pelo Gemini.')
  if (status >= 500) return new Error('O Gemini está temporariamente indisponível.')
  return new Error(`O Gemini recusou a solicitação (HTTP ${status}).`)
}

function invalidResponse() {
  return new Error('O Gemini retornou uma resposta incompatível. Tente novamente ou registre a refeição manualmente.')
}

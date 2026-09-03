import {
  AiProviderError,
  validateDietPlanDraft,
  validateFoodImageDraft,
  validateMealParseDraft,
  validateTrainingPlanDraft,
  type AiProvider,
  type DietPlanDraft,
  type FoodImageDraft,
  type MealParseDraft,
  type TrainingPlanDraft,
} from '@training/training-domain'

export const AI_PRIVACY_NOTICE = 'Segundo a documentação atual do Google, conteúdo enviado através do Free Tier da Gemini API pode ser utilizado pelo Google para melhorar seus produtos. Consulte os termos atuais antes de habilitar o recurso.'

type FetchLike = typeof fetch
type GatewayResponse = { draft?: unknown; message?: string; fields?: { code?: string } }

/** Optional network adapter. It has no key, is opt-in per call, and manual logging remains available on any failure. */
export class AiGatewayClient implements AiProvider {
  constructor(private readonly baseUrl: string | null = process.env.EXPO_PUBLIC_AI_GATEWAY_URL?.replace(/\/$/, '') ?? null, private readonly request: FetchLike = fetch) {}

  parseMeal(input: Parameters<AiProvider['parseMeal']>[0]): Promise<MealParseDraft> { return this.call('meal-parse', input, validateMealParseDraft) }
  analyzeMealImage(input: Parameters<AiProvider['analyzeMealImage']>[0]): Promise<FoodImageDraft> { return this.call('meal-vision', input, validateFoodImageDraft) }
  generateDiet(input: Parameters<AiProvider['generateDiet']>[0]): Promise<DietPlanDraft> { return this.call('diet-plan', input, validateDietPlanDraft) }
  generateTrainingPlan(input: Parameters<AiProvider['generateTrainingPlan']>[0]): Promise<TrainingPlanDraft> { return this.call('training-plan', input, (draft) => validateTrainingPlanDraft(draft, input.context.candidateExercises.map((exercise) => exercise.id))) }

  private async call<T>(task: string, payload: unknown, validate: (draft: unknown) => T): Promise<T> {
    if (!this.baseUrl) throw new AiProviderError('UNAVAILABLE', 'IA opcional não configurada neste aplicativo. O registro manual continua disponível.')
    try {
      const response = await this.request(`${this.baseUrl}/api/ai/${task}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json().catch(() => ({})) as GatewayResponse
      if (!response.ok) throw new AiProviderError(errorCode(response.status, body.fields?.code), body.message || 'Não foi possível obter um rascunho da IA.')
      return validate(body.draft)
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw new AiProviderError('UNAVAILABLE', 'Não foi possível conectar à IA. Tente novamente ou registre manualmente.')
    }
  }
}

function errorCode(status: number, code?: string): AiProviderError['code'] {
  if (code === 'INVALID_IMAGE') return 'INVALID_IMAGE'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 401 || status === 403) return 'UNAUTHORIZED'
  if (status >= 500) return 'UPSTREAM_FAILURE'
  return 'INVALID_RESPONSE'
}

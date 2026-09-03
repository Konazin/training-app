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
  type AiTask,
} from '@training/training-domain'

export const AI_PRIVACY_NOTICE = 'Segundo a documentação atual do Google, conteúdo enviado através do Free Tier da Gemini API pode ser utilizado pelo Google para melhorar seus produtos. Consulte os termos atuais antes de habilitar o recurso.'

type FetchLike = typeof fetch
type GatewayResponse = { draft?: unknown; message?: string; fields?: { code?: string } }
export interface AiGatewayStatus { available: boolean; provider: 'gemini'; model: string; capabilities: Array<'meal_parse' | 'meal_vision' | 'diet_plan' | 'training_plan'> }
export const AI_TIMEOUTS_MS: Record<AiTask, number> = { 'meal-parse': 20_000, 'meal-vision': 90_000, 'diet-plan': 20_000, 'training-plan': 20_000 }

/** Optional network adapter. It has no key, is opt-in per call, and manual logging remains available on any failure. */
export class AiGatewayClient implements AiProvider {
  constructor(private readonly baseUrl: string | null = process.env.EXPO_PUBLIC_AI_GATEWAY_URL?.replace(/\/$/, '') ?? null, private readonly request: FetchLike = fetch, private readonly timeoutMs?: number) {}

  parseMeal(input: Parameters<AiProvider['parseMeal']>[0]): Promise<MealParseDraft> { return this.call('meal-parse', input, validateMealParseDraft) }
  analyzeMealImage(input: Parameters<AiProvider['analyzeMealImage']>[0]): Promise<FoodImageDraft> { return this.call('meal-vision', input, validateFoodImageDraft) }
  generateDiet(input: Parameters<AiProvider['generateDiet']>[0]): Promise<DietPlanDraft> { return this.call('diet-plan', input, validateDietPlanDraft) }
  generateTrainingPlan(input: Parameters<AiProvider['generateTrainingPlan']>[0]): Promise<TrainingPlanDraft> { return this.call('training-plan', input, (draft) => validateTrainingPlanDraft(draft, input.context.candidateExercises.map((exercise) => exercise.id))) }
  async getStatus(): Promise<AiGatewayStatus> {
    if (!this.baseUrl) return { available: false, provider: 'gemini', model: 'gemini-3.8-flash', capabilities: [] }
    const response = await this.withTimeout('status', (signal) => this.request(`${this.baseUrl}/api/ai/status`, { headers: { accept: 'application/json' }, signal }))
    if (!response.ok) return { available: false, provider: 'gemini', model: 'gemini-3.8-flash', capabilities: [] }
    const value = await response.json() as Partial<AiGatewayStatus>
    return { available: value.available === true, provider: 'gemini', model: typeof value.model === 'string' ? value.model : 'gemini-3.8-flash', capabilities: Array.isArray(value.capabilities) ? value.capabilities.filter(isCapability) : [] }
  }

  private async call<T>(task: AiTask, payload: unknown, validate: (draft: unknown) => T): Promise<T> {
    const started = Date.now(); devLog({ task, event: 'request_start' })
    if (!this.baseUrl) { const error = new AiProviderError('UNAVAILABLE', 'IA opcional não configurada neste aplicativo. O registro manual continua disponível.'); devLogEnd(task, started, 0, error); throw error }
    let status = 0
    try {
      const response = await this.withTimeout(task, (signal) => this.request(`${this.baseUrl}/api/ai/${task}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal }))
      status = response.status
      const body = await response.json().catch(() => ({})) as GatewayResponse
      if (!response.ok) { const code = errorCode(response.status, body.fields?.code); throw new AiProviderError(code, errorMessage(code, task)) }
      try { const result = validate(body.draft); devLogEnd(task, started, status); return result } catch { throw new AiProviderError(task === 'meal-vision' ? 'SCHEMA_ERROR' : 'INVALID_RESPONSE', errorMessage(task === 'meal-vision' ? 'SCHEMA_ERROR' : 'INVALID_RESPONSE', task)) }
    } catch (error) {
      const normalized = error instanceof AiProviderError ? error : new AiProviderError('NETWORK_ERROR', errorMessage('NETWORK_ERROR', task))
      devLogEnd(task, started, status, normalized)
      throw normalized
    }
  }
  private async withTimeout<T>(task: AiTask | 'status', work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.timeoutMs ?? (task === 'status' ? 20_000 : AI_TIMEOUTS_MS[task]))
    try { return await work(controller.signal) } catch (error) { if (controller.signal.aborted) throw new AiProviderError('TIMEOUT', errorMessage('TIMEOUT', task)); throw error } finally { clearTimeout(timeout) }
  }
}

function errorCode(status: number, code?: string): AiProviderError['code'] {
  if (code === 'IMAGE_REJECTED' || code === 'INVALID_IMAGE') return 'IMAGE_REJECTED'
  if (code === 'SCHEMA_ERROR') return 'SCHEMA_ERROR'
  if (code === 'NETWORK_ERROR') return 'NETWORK_ERROR'
  if (code === 'UNAVAILABLE') return 'UNAVAILABLE'
  if (code === 'PROVIDER_ERROR' || code === 'UPSTREAM_FAILURE') return 'PROVIDER_ERROR'
  if (code === 'QUOTA_EXCEEDED') return 'QUOTA_EXHAUSTED'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 401 || status === 403) return 'UNAUTHORIZED'
  if (status >= 500) return 'PROVIDER_ERROR'
  return 'INVALID_RESPONSE'
}
function errorMessage(code: AiProviderError['code'], task: AiTask | 'status') {
  if (code === 'TIMEOUT') return task === 'meal-vision' ? 'A análise da imagem demorou mais do que o esperado.' : 'A IA demorou demais para responder. Tente novamente ou registre manualmente.'
  if (code === 'SCHEMA_ERROR' || code === 'INVALID_RESPONSE') return task === 'meal-vision' ? 'A IA respondeu, mas não foi possível interpretar a análise.' : 'Não foi possível interpretar a resposta da IA.'
  if (code === 'RATE_LIMITED' || code === 'QUOTA_EXHAUSTED') return 'O limite temporário da IA foi atingido.'
  if (code === 'NETWORK_ERROR') return 'Não foi possível acessar o serviço de IA.'
  if (code === 'IMAGE_REJECTED') return 'A imagem não pôde ser processada. Escolha outra foto ou registre manualmente.'
  if (code === 'UNAVAILABLE') return 'A IA está indisponível neste momento. O registro manual continua disponível.'
  if (code === 'UNAUTHORIZED' || code === 'PROVIDER_ERROR') return 'O serviço de IA apresentou uma falha temporária.'
  return 'Não foi possível obter um rascunho da IA.'
}
function devLog(value: { task: string; event: string }) { if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[ai]', value) }
function devLogEnd(task: string, started: number, status: number, error?: AiProviderError) { if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[ai]', { task, event: 'request_end', elapsedMs: Date.now() - started, status, errorClass: error?.code ?? null }) }
function isCapability(value: unknown): value is AiGatewayStatus['capabilities'][number] { return value === 'meal_parse' || value === 'meal_vision' || value === 'diet_plan' || value === 'training_plan' }

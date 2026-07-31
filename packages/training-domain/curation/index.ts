import type { ExternalExerciseCandidate } from '../model'
import { normalizeName } from '../rules'

export interface StarterPackIntent {
  semanticKey: string
  ptBrQuery: string
  enQuery: string
  expectedPrimaryMuscle: string
  equipmentAliases: readonly string[]
  expectedCategory: string
  imageRequired: boolean
}

export const STARTER_PACK_TARGET = 50
export const STARTER_PACK_MINIMUM = 35
export const STARTER_PACK_MAXIMUM = 50

export type MediaPolicy = 'REQUIRED' | 'OPTIONAL'

export function mediaPolicyFor(intent: Pick<StarterPackIntent, 'expectedCategory'>): MediaPolicy {
  return ['mobilidade', 'alongamento', 'condicionamento'].includes(normalizeName(intent.expectedCategory))
    ? 'OPTIONAL'
    : 'REQUIRED'
}

export function recommendedPackEnabled(approvedCount: number, rejectedItemsIncluded = 0) {
  return approvedCount >= STARTER_PACK_MINIMUM
    && approvedCount <= STARTER_PACK_MAXIMUM
    && rejectedItemsIncluded === 0
}

export interface RankedCurationCandidate {
  candidate: ExternalExerciseCandidate
  score: number
  valid: boolean
  reasons: string[]
}

export function validateStarterPackIntents(intents: readonly StarterPackIntent[]) {
  if (intents.length !== STARTER_PACK_TARGET) throw new Error(`A curadoria deve conter exatamente ${STARTER_PACK_TARGET} intenções.`)
  const keys = new Set<string>()
  for (const intent of intents) {
    if (!/^[a-z0-9_]+$/.test(intent.semanticKey) || keys.has(intent.semanticKey)) {
      throw new Error(`Chave de intenção inválida ou duplicada: ${intent.semanticKey}`)
    }
    if (!intent.ptBrQuery.trim() || !intent.enQuery.trim()
      || !intent.expectedPrimaryMuscle.trim() || !intent.expectedCategory.trim()
      || !intent.equipmentAliases.length || typeof intent.imageRequired !== 'boolean') {
      throw new Error(`Intenção incompleta: ${intent.semanticKey}`)
    }
    keys.add(intent.semanticKey)
  }
  return intents
}

export function rankCurationCandidates(
  intent: StarterPackIntent,
  candidates: readonly ExternalExerciseCandidate[],
): RankedCurationCandidate[] {
  return candidates.map((candidate) => validateCandidate(intent, candidate))
    .sort((a, b) => b.score - a.score || Number(b.valid) - Number(a.valid)
      || Number(a.candidate.externalId) - Number(b.candidate.externalId))
}

export function selectStrictCurationCandidate(
  intent: StarterPackIntent,
  candidates: readonly ExternalExerciseCandidate[],
) {
  const ranked = rankCurationCandidates(intent, candidates)
  const valid = ranked.filter((item) => item.valid)
  if (!valid.length || (valid[1] && valid[1].score === valid[0]!.score)) return null
  return valid[0]!.candidate
}

function validateCandidate(
  intent: StarterPackIntent,
  candidate: ExternalExerciseCandidate,
): RankedCurationCandidate {
  const reasons: string[] = []
  if (!/^\d+$/.test(candidate.externalId)) reasons.push('ID externo ausente ou inválido')
  if (!candidate.name.trim()) reasons.push('nome ausente')
  if (!candidate.description.trim() && !candidate.instructions.trim()) {
    reasons.push('descrição e instruções ausentes')
  }
  const image = candidate.media.find((item) => item.type === 'IMAGE' && item.main)
    ?? candidate.media.find((item) => item.type === 'IMAGE')
  if (mediaPolicyFor(intent) === 'REQUIRED' && !image) reasons.push('imagem real ausente')
  else if (image && !isHttps(image.remoteUrl)) reasons.push('URL de imagem insegura')
  if (!isHttps(candidate.sourceUrl) || !candidate.licenseName?.trim()
    || !isHttps(candidate.licenseUrl)) {
    reasons.push('atribuição ou licença incompleta')
  }
  const nameScore = nameSimilarity(intent, candidate.name)
  if (nameScore < 2) reasons.push('movimento não corresponde à intenção')
  if (unexpectedVariant(intent, candidate.name)) reasons.push('variante diferente da intenção')
  const muscle = compatible(candidate.primaryMuscleGroup, [intent.expectedPrimaryMuscle])
  if (!muscle) reasons.push('grupo muscular incompatível')
  const equipment = compatible(candidate.equipment, intent.equipmentAliases)
  if (!equipment) reasons.push('equipamento incompatível')
  const category = categoryCompatible(candidate.category, intent.expectedCategory)
  if (!category) reasons.push('categoria incompatível')
  const score = nameScore * 20
    + Number(muscle) * 16
    + Number(equipment) * 12
    + Number(category) * 8
    + Number(candidate.language === 'pt-br') * 6
    + Number(candidate.language === 'pt') * 4
    + Number(Boolean(candidate.description.trim() || candidate.instructions.trim())) * 3
    + Number(Boolean(image)) * 3
    + Number(isHttps(candidate.sourceUrl) && isHttps(candidate.licenseUrl)) * 2
  return { candidate, score, valid: reasons.length === 0, reasons }
}

function nameSimilarity(intent: StarterPackIntent, name: string) {
  const value = normalizeName(name)
  const expected = [normalizeName(intent.ptBrQuery), normalizeName(intent.enQuery)]
  if (expected.includes(value)) return 4
  if (expected.some((item) => value.includes(item) || item.includes(value))) return 3
  const tokens = new Set(value.split(' ').filter((item) => item.length > 2))
  return Math.max(...expected.map((item) => {
    const wanted = item.split(' ').filter((token) => token.length > 2)
    return wanted.length && wanted.filter((token) => tokens.has(token)).length / wanted.length >= 0.6
      ? 2
      : 0
  }))
}

function unexpectedVariant(intent: StarterPackIntent, name: string) {
  const expected = normalizeName(`${intent.ptBrQuery} ${intent.enQuery}`)
  const actual = normalizeName(name)
  return ['pike'].some((marker) => actual.includes(marker) && !expected.includes(marker))
}

function compatible(value: string, expected: readonly string[]) {
  const normalized = normalizeName(value)
  return expected.some((item) => {
    const alias = normalizeName(item)
    return normalized.includes(alias) || alias.includes(normalized)
      || compatibilityAliases(alias).some((candidate) => normalized.includes(candidate))
  })
}

function compatibilityAliases(value: string) {
  const aliases: Record<string, string[]> = {
    peitoral: ['chest', 'pectoralis'],
    costas: ['back', 'latissimus', 'trapezius'],
    ombros: ['shoulders', 'deltoid'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    quadriceps: ['quadriceps'],
    posteriores: ['hamstrings'],
    gluteos: ['gluteus'],
    panturrilhas: ['calves', 'gastrocnemius', 'soleus'],
    barra: ['barbell'],
    halter: ['dumbbell'],
    halteres: ['dumbbell'],
    cabo: ['cable'],
    polia: ['cable'],
    maquina: ['machine'],
    'peso corporal': ['bodyweight', 'none'],
    'sem equipamento': ['bodyweight', 'none'],
  }
  return Object.entries(aliases)
    .filter(([key]) => value.includes(key))
    .flatMap(([, matches]) => matches)
}

function categoryCompatible(value: string, expected: string) {
  const categories: Record<string, string[]> = {
    forca: ['STRENGTH', 'HYPERTROPHY'],
    core: ['STRENGTH', 'ENDURANCE'],
    mobilidade: ['MOBILITY', 'RECOVERY'],
    alongamento: ['STRETCHING', 'MOBILITY'],
    condicionamento: ['CARDIO', 'ENDURANCE'],
  }
  return (categories[normalizeName(expected)] ?? []).includes(value)
}

function isHttps(value: string | null) {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

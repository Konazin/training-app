import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExternalExerciseCandidate } from '../model'
import {
  rankCurationCandidates,
  selectStrictCurationCandidate,
  validateStarterPackIntents,
  type StarterPackIntent,
} from '../curation'

const list = JSON.parse(readFileSync(
  new URL('../../../tools/wger-starter-pack-intents.v1.json', import.meta.url),
  'utf8',
)).intents as StarterPackIntent[]
const intent = list[0]!

describe('curadoria estrita do pacote Wger', () => {
  it('mantém exatamente 50 chaves únicas e intenções completas', () => {
    expect(validateStarterPackIntents(list)).toHaveLength(50)
    expect(new Set(list.map((item) => item.semanticKey)).size).toBe(50)
  })

  it('não aceita automaticamente o primeiro resultado e rejeita incompatibilidades', () => {
    const wrong = candidate({ externalId: '1', name: 'Agachamento', primaryMuscleGroup: 'Quadriceps' })
    const valid = candidate({ externalId: '2' })
    expect(selectStrictCurationCandidate(intent, [wrong, valid])?.externalId).toBe('2')
    expect(rankCurationCandidates(intent, [wrong])[0]?.reasons)
      .toContain('grupo muscular incompatível')
  })

  it.each([
    ['descrição ausente', { description: '', instructions: '' }, 'descrição e instruções ausentes'],
    ['imagem ausente', { media: [] }, 'imagem real ausente'],
    ['URL insegura', { media: [{ ...candidate().media[0]!, remoteUrl: 'http://wger.de/a.jpg' }] }, 'URL de imagem insegura'],
    ['atribuição incompleta', { licenseUrl: null }, 'atribuição ou licença incompleta'],
    ['equipamento incompatível', { equipment: 'Dumbbell' }, 'equipamento incompatível'],
  ])('rejeita %s', (_label, patch, reason) => {
    expect(rankCurationCandidates(intent, [candidate(patch)])[0]).toMatchObject({
      valid: false,
      reasons: expect.arrayContaining([reason]),
    })
  })

  it('rejeita empate ambíguo e preserva as entradas', () => {
    const candidates = [candidate({ externalId: '10' }), candidate({ externalId: '11' })]
    const original = JSON.stringify(candidates)
    expect(selectStrictCurationCandidate(intent, candidates)).toBeNull()
    expect(JSON.stringify(candidates)).toBe(original)
  })

  it('rejeita variante Pike quando a intenção é flexão genérica', () => {
    const pushUp = list.find((item) => item.semanticKey === 'push_up')!
    expect(rankCurationCandidates(pushUp, [candidate({
      name: 'Pike Push Up',
      equipment: 'none (bodyweight exercise)',
    })])[0]?.reasons).toContain('variante diferente da intenção')
  })
})

function candidate(
  patch: Partial<ExternalExerciseCandidate> = {},
): ExternalExerciseCandidate {
  return {
    provider: 'WGER',
    externalId: '73',
    name: 'Barbell bench press',
    description: 'Provider description',
    primaryMuscleGroup: 'Chest',
    secondaryMuscleGroups: [],
    equipment: 'Barbell',
    category: 'STRENGTH',
    difficulty: 'Provider',
    instructions: 'Provider instructions',
    unilateral: false,
    timed: false,
    sourceUrl: 'https://wger.de/en/exercise/73/view',
    licenseName: 'CC-BY-SA',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'wger.de',
    media: [{
      type: 'IMAGE',
      source: 'WGER',
      externalId: 'image-1',
      remoteUrl: 'https://wger.de/media/73.jpg',
      thumbnailRemoteUrl: null,
      mimeType: 'image/jpeg',
      width: null,
      height: null,
      durationSeconds: null,
      main: true,
      sortOrder: 0,
      licenseName: 'CC-BY-SA',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      author: 'wger.de',
      sourceUrl: 'https://wger.de/en/exercise/73/view',
    }],
    warnings: [],
    language: 'en',
    original: {},
    ...patch,
  }
}

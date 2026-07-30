import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/exerciseinfo.sample.json'
import { mapCategory, mapWgerExercise, sanitizeText, selectTranslation, type WgerMetadata } from '..'

const metadata: WgerMetadata = {
  languages: new Map([[2, 'en'], [7, 'pt'], [99, 'pt-br']]),
  licenses: new Map([[2, {
    id: 2,
    full_name: 'Creative Commons Attribution Share Alike 4',
    short_name: 'CC-BY-SA 4',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en',
  }]]),
}

describe('Wger mapper', () => {
  it('seleciona pt-br, pt, inglês e primeira tradução válida', () => {
    const translations = [
      { name: '', language: 99 },
      { name: 'Português', language: 7 },
      { name: 'English', language: 2 },
      { name: 'Deutsch', language: 1 },
    ]
    expect(selectTranslation(translations, metadata.languages, 'pt-br', 'en')).toMatchObject({
      language: 'pt', fallback: true,
    })
    expect(selectTranslation([{ name: 'Brasil', language: 99 }], metadata.languages, 'pt_br', 'en'))
      .toMatchObject({ language: 'pt-br', fallback: false })
    expect(selectTranslation(translations.slice(2), metadata.languages, 'pt-br', 'en'))
      .toMatchObject({ language: 'en', fallback: true })
    expect(selectTranslation([{ name: 'Deutsch', language: 1 }], metadata.languages, 'pt-br', 'en'))
      .toMatchObject({ language: 'id-1', fallback: true })
    expect(selectTranslation([{ name: '  ', language: 2 }, { language: 7 }], metadata.languages)).toBeNull()
  })

  it('sanitiza HTML, listas, entidades, scripts e controles', () => {
    expect(sanitizeText('<p>A&nbsp;&amp; B</p><ul><li>Um</li><li>Dois</li></ul><script>alert(1)</script>\u0000'))
      .toBe('A & B\n\n• Um\n• Dois')
  })

  it('mapeia músculos, equipamento, licença, autoria, imagem e categoria', () => {
    const candidate = mapWgerExercise(fixture.results[0], metadata)
    expect(candidate).toMatchObject({
      provider: 'WGER',
      externalId: '983',
      name: 'Rosca sem peso',
      primaryMuscleGroup: 'Biceps',
      equipment: 'none (bodyweight exercise)',
      category: 'STRENGTH',
      licenseName: 'Creative Commons Attribution Share Alike 4',
      author: 'wger.de',
      language: 'pt',
    })
    expect(candidate?.media[0]).toMatchObject({
      type: 'IMAGE',
      externalId: '74041371-1019-4f89-9ebe-cec792484a46',
      main: true,
    })
  })

  it('rejeita item sem nome e mídia insegura ou inválida sem inventar dados', () => {
    const raw = structuredClone(fixture.results[0]) as Record<string, unknown>
    raw.translations = [{ name: '', language: 2 }]
    expect(mapWgerExercise(raw, metadata)).toBeNull()
    raw.translations = [{ name: 'Valid', language: 2 }]
    raw.images = [
      { id: 1, image: 'http://wger.de/a.png' },
      { id: 2, image: 'https://wger.de/a.png', width: -1 },
      { image: 'https://wger.de/a.png' },
    ]
    expect(mapWgerExercise(raw, metadata)?.media).toHaveLength(0)
    expect(mapCategory('Cardio')).toBe('CARDIO')
    expect(mapCategory('Mobilidade')).toBe('MOBILITY')
    expect(mapCategory('Alongamento')).toBe('STRETCHING')
    expect(mapCategory('Recuperação')).toBe('RECOVERY')
    expect(mapCategory('Técnica')).toBe('TECHNIQUE')
  })
})

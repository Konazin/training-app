export interface TranslationSelection {
  translation: Record<string, unknown>
  language: string
  fallback: boolean
}

export function selectTranslation(
  translations: unknown,
  languages: Map<number, string>,
  requested = 'pt-br',
  fallbackLanguage = 'en',
): TranslationSelection | null {
  if (!Array.isArray(translations)) return null
  const valid = translations.filter((value): value is Record<string, unknown> =>
    isObject(value) && typeof value.name === 'string' && value.name.trim().length > 0
      && Number.isInteger(value.language))
  const wanted = unique([
    normalizeLanguage(requested),
    baseLanguage(requested),
    normalizeLanguage(fallbackLanguage),
    'en',
  ])
  for (const code of wanted) {
    const translation = valid.find((item) => matchesLanguage(languages.get(item.language as number), code))
    if (translation) return { translation, language: languages.get(translation.language as number) ?? code, fallback: code !== normalizeLanguage(requested) }
  }
  const translation = valid[0]
  if (!translation) return null
  return {
    translation,
    language: languages.get(translation.language as number) ?? `id-${translation.language}`,
    fallback: true,
  }
}

export function normalizeLanguage(value: string) {
  return value.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-')
}

function baseLanguage(value: string) {
  return normalizeLanguage(value).split('-')[0] ?? ''
}

function matchesLanguage(actual: string | undefined, wanted: string) {
  return normalizeLanguage(actual ?? '') === wanted
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

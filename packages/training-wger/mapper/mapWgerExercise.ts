import type {
  ExternalExerciseCandidate,
  ExternalExerciseMediaCandidate,
} from '@training/training-domain'
import type { WgerMetadata } from '../client/types'
import { mapCategory } from './category'
import { selectTranslation } from './language'
import { sanitizeText } from './sanitizeText'

export function mapWgerExercise(
  value: unknown,
  metadata: WgerMetadata,
  language = 'pt-br',
  fallbackLanguage = 'en',
): ExternalExerciseCandidate | null {
  if (!isObject(value)) return null
  const externalId = externalIdentifier(value, true)
  const selected = selectTranslation(value.translations, metadata.languages, language, fallbackLanguage)
  if (!externalId || !selected) return null
  const warnings: string[] = []
  if (selected.fallback) warnings.push(selected.language === 'en' ? 'Tradução em inglês' : `Tradução em ${selected.language}`)
  const primaryMuscles = names(value.muscles)
  const secondaryMuscles = names(value.muscles_secondary)
  const equipment = names(value.equipment)
  if (!primaryMuscles.length) warnings.push('Músculo principal não informado pela fonte')
  if (!equipment.length) warnings.push('Equipamento não informado pela fonte')
  const license = licenseObject(value.license, metadata)
  const author = text(selected.translation.license_author) || text(value.license_author) || firstString(value.author_history)
  const sourceUrl = `https://wger.de/en/exercise/${value.id}/view`
  const media = [
    ...mapMedia(value.images, 'IMAGE', metadata, license, sourceUrl),
    ...mapMedia(value.videos, 'VIDEO', metadata, license, sourceUrl),
  ]
  const description = sanitizeText(selected.translation.description_source || selected.translation.description)
  return {
    provider: 'WGER',
    externalId,
    name: sanitizeText(selected.translation.name),
    description,
    primaryMuscleGroup: primaryMuscles[0] ?? 'Não informado',
    secondaryMuscleGroups: [...primaryMuscles.slice(1), ...secondaryMuscles],
    equipment: equipment.join(', ') || 'Não informado',
    category: mapCategory(value.category),
    difficulty: 'Não informado',
    instructions: description,
    unilateral: false,
    timed: false,
    sourceUrl,
    licenseName: license?.full_name ?? license?.short_name ?? null,
    licenseUrl: secureUrl(license?.url) ?? null,
    author: author || null,
    media,
    warnings,
    language: selected.language,
    original: value,
  }
}

function mapMedia(
  value: unknown,
  type: ExternalExerciseMediaCandidate['type'],
  metadata: WgerMetadata,
  fallbackLicense: ReturnType<typeof licenseObject>,
  exerciseSourceUrl: string,
) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, sortOrder): ExternalExerciseMediaCandidate[] => {
    if (!isObject(item)) return []
    const externalId = externalIdentifier(item)
    const remoteUrl = secureUrl(type === 'IMAGE' ? item.image : item.video)
    const width = optionalNonNegative(item.width)
    const height = optionalNonNegative(item.height)
    const durationSeconds = optionalNonNegative(item.duration)
    if (!externalId || !remoteUrl || width === false || height === false || durationSeconds === false) return []
    const license = licenseObject(item.license, metadata) ?? fallbackLicense
    const thumbnailRemoteUrl = type === 'IMAGE' && isObject(item.thumbnails)
      ? secureUrl(item.thumbnails.medium) ?? secureUrl(item.thumbnails.small)
      : null
    return [{
      type,
      source: 'WGER',
      externalId,
      remoteUrl,
      thumbnailRemoteUrl,
      mimeType: mimeFromUrl(remoteUrl, type),
      width,
      height,
      durationSeconds,
      main: item.is_main === true,
      sortOrder,
      licenseName: license?.full_name ?? license?.short_name ?? null,
      licenseUrl: secureUrl(license?.url) ?? null,
      author: text(item.license_author) || firstString(item.author_history) || null,
      sourceUrl: secureUrl(item.license_object_url)
        ?? secureUrl(item.license_derivative_source_url)
        ?? exerciseSourceUrl,
    }]
  })
}

function externalIdentifier(value: Record<string, unknown>, preferNumeric = false) {
  if (preferNumeric && typeof value.id === 'number' && Number.isInteger(value.id)) return String(value.id)
  if (typeof value.uuid === 'string' && value.uuid.trim()) return value.uuid.trim()
  if (typeof value.id === 'number' && Number.isInteger(value.id)) return String(value.id)
  return ''
}

function names(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isObject(item)) return []
    const name = text(item.name_en) || text(item.name)
    return name ? [sanitizeText(name)] : []
  })
}

function licenseObject(value: unknown, metadata: WgerMetadata) {
  if (typeof value === 'number') return metadata.licenses.get(value) ?? null
  if (!isObject(value)) return null
  return {
    id: typeof value.id === 'number' ? value.id : 0,
    full_name: text(value.full_name),
    short_name: text(value.short_name),
    url: secureUrl(value.url),
  }
}

function secureUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function optionalNonNegative(value: unknown): number | null | false {
  if (value == null || value === '') return null
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : false
}

function mimeFromUrl(url: string, type: ExternalExerciseMediaCandidate['type']) {
  const path = new URL(url).pathname.toLowerCase()
  const extension = path.match(/\.([a-z0-9]+)$/)?.[1]
  const known: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm',
  }
  return extension ? known[extension] ?? null : type === 'VIDEO' ? 'video/mp4' : null
}

function firstString(value: unknown) {
  return Array.isArray(value) ? value.find((item): item is string => typeof item === 'string' && item.trim().length > 0) ?? '' : ''
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

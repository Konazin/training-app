import { Alert } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Directory, File, Paths } from 'expo-file-system'
import {
  WGER_STARTER_PACK,
  validateWgerStarterPackManifest,
  type ApprovedWgerExercise,
  type ExternalExerciseCandidate,
  type ExternalExerciseImportRepository,
} from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError } from '@training/training-wger'

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_IMPORT_IMAGE_BYTES = 150 * 1024 * 1024
const POST_COMMIT_REFRESH_WARNING = 'Exercícios importados, mas a tela não foi atualizada.'

export type StarterPackImportState =
  | { status: 'IDLE' }
  | { status: 'FETCHING'; completed: number; total: number }
  | { status: 'DOWNLOADING_MEDIA'; completed: number; total: number }
  | { status: 'VALIDATING'; total: number }
  | { status: 'AWAITING_PARTIAL_CONFIRMATION'; valid: number; unavailable: PackFailure[] }
  | { status: 'COMMITTING'; total: number }
  | { status: 'SUCCESS'; imported: number; skipped: number; withoutDemo: number }
  | { status: 'SUCCESS_WITH_WARNING'; imported: number; skipped: number; withoutDemo: number; message: string }
  | { status: 'ERROR'; message: string }

export interface PackFailure {
  intentKey: string
  name: string
  reason: string
}

export function useStarterPackImportController(
  imports: ExternalExerciseImportRepository,
  onImported: () => Promise<unknown>,
  providerOverride?: WgerExerciseCatalogProvider,
) {
  const provider = useRef(providerOverride ?? new WgerExerciseCatalogProvider()).current
  const [state, setState] = useState<StarterPackImportState>({ status: 'IDLE' })
  const stateRef = useRef<StarterPackImportState>({ status: 'IDLE' })
  const mountedRef = useRef(true)
  const activeRef = useRef(false)
  const operationIdRef = useRef(0)
  const abort = useRef<AbortController | null>(null)
  const validCandidates = useRef<ExternalExerciseCandidate[]>([])
  const unavailable = useRef<PackFailure[]>([])
  const ownedFiles = useRef(new Set<File>())
  const ownedDirectories = useRef(new Set<Directory>())
  const cleanupPending = useRef<(() => void) | undefined>(undefined)

  const publish = useCallback((next: StarterPackImportState) => {
    stateRef.current = next
    if (mountedRef.current) setState(next)
  }, [])

  const clearOwnedFiles = useCallback(() => {
    for (const file of ownedFiles.current) {
      if (file.exists) file.delete()
    }
    for (const directory of ownedDirectories.current) {
      if (directory.exists) directory.delete()
    }
    ownedFiles.current.clear()
    ownedDirectories.current.clear()
    cleanupPending.current = undefined
  }, [])

  const invalidateOperation = useCallback((expectedId?: number) => {
    if (expectedId !== undefined && operationIdRef.current !== expectedId) return false
    operationIdRef.current += 1
    abort.current?.abort()
    abort.current = null
    activeRef.current = false
    validCandidates.current = []
    unavailable.current = []
    clearOwnedFiles()
    if (mountedRef.current) publish({ status: 'IDLE' })
    return true
  }, [clearOwnedFiles, publish])

  useEffect(() => () => {
    mountedRef.current = false
    operationIdRef.current += 1
    abort.current?.abort()
    abort.current = null
    activeRef.current = false
    clearOwnedFiles()
  }, [clearOwnedFiles])

  const releaseOperation = useCallback(() => {
    activeRef.current = false
    abort.current = null
  }, [])

  const commit = useCallback(async (
    candidates: ExternalExerciseCandidate[],
    skipped: number,
    withoutDemo: number,
    operationId: number,
    controller: AbortController,
  ) => {
    const isCurrent = () => isCurrentOperation(operationId, controller.signal, mountedRef.current, operationIdRef.current)
    if (!isCurrent()) return false
    publish({ status: 'COMMITTING', total: candidates.length })
    let result
    try {
      if (!isCurrent()) return false
      result = await imports.importSelected(candidates)
    } catch (error) {
      clearOwnedFiles()
      if (!isCurrent()) return false
      releaseOperation()
      publish({ status: 'ERROR', message: messageFrom(error) })
      return false
    }

    // Depois deste ponto o SQLite confirmou: arquivos são propriedade do catálogo.
    ownedFiles.current.clear()
    ownedDirectories.current.clear()
    cleanupPending.current = undefined
    if (!isCurrent()) {
      releaseOperation()
      return true
    }
    try {
      const refreshed = await onImported()
      if (!isCurrent()) {
        releaseOperation()
        return true
      }
      if (refreshed === false) throw new Error(POST_COMMIT_REFRESH_WARNING)
      releaseOperation()
      publish({ status: 'SUCCESS', imported: result.created + result.updated, skipped, withoutDemo })
      return true
    } catch {
      if (!isCurrent()) {
        releaseOperation()
        return true
      }
      releaseOperation()
      publish({
        status: 'SUCCESS_WITH_WARNING',
        imported: result.created + result.updated,
        skipped,
        withoutDemo,
        message: POST_COMMIT_REFRESH_WARNING,
      })
      return true
    }
  }, [clearOwnedFiles, imports, onImported, publish, releaseOperation])

  const importAvailable = useCallback((expectedId?: number) => {
    const operationId = expectedId ?? operationIdRef.current
    const controller = abort.current
    if (!activeRef.current || !controller || operationIdRef.current !== operationId
      || stateRef.current.status !== 'AWAITING_PARTIAL_CONFIRMATION') return false
    return commit(
      validCandidates.current,
      unavailable.current.length,
      countWithoutDemo(validCandidates.current),
      operationId,
      controller,
    )
  }, [commit])

  const run = useCallback(async () => {
    if (activeRef.current) return false
    const operationId = operationIdRef.current + 1
    operationIdRef.current = operationId
    activeRef.current = true
    const controller = new AbortController()
    abort.current = controller
    const isCurrent = () => isCurrentOperation(operationId, controller.signal, mountedRef.current, operationIdRef.current)
    cleanupPending.current = () => {
      for (const file of ownedFiles.current) if (file.exists) file.delete()
      for (const directory of ownedDirectories.current) if (directory.exists) directory.delete()
      ownedFiles.current.clear()
      ownedDirectories.current.clear()
      cleanupPending.current = undefined
    }
    const candidates: ExternalExerciseCandidate[] = []
    const failures: PackFailure[] = []
    try {
      const manifest = validateWgerStarterPackManifest(WGER_STARTER_PACK)
      for (const [index, item] of manifest.entries()) {
        if (!isCurrent()) return false
        publish({ status: 'FETCHING', completed: index, total: manifest.length })
        const candidate = await provider.findByExternalId(String(item.providerExerciseId), 'pt-br', controller.signal)
        if (!isCurrent()) return false

        if (!candidate) {
          failures.push({
            intentKey: item.intentKey,
            name: item.reviewedPtBrName,
            reason: 'ID não encontrado no Wger.',
          })
          continue
        }

        const failure = validateCurrentEntry(item, candidate)

        if (failure) {
          failures.push({
            intentKey: item.intentKey,
            name: item.reviewedPtBrName,
            reason: failure,
          })
          continue
        }

        candidates.push(candidate)
      }

      if (!isCurrent()) return false
      publish({ status: 'VALIDATING', total: manifest.length })
      const downloadedCandidates: ExternalExerciseCandidate[] = []
      const importDirectory = new Directory(Paths.document, 'training-app', 'wger-media')
      importDirectory.create({ intermediates: true, idempotent: true })
      const temporaryDirectory = new Directory(Paths.cache, `starter-pack-${Date.now()}`)
      temporaryDirectory.create({ intermediates: true, idempotent: true })
      ownedDirectories.current.add(temporaryDirectory)
      let totalBytes = 0

      for (const [index, candidate] of candidates.entries()) {
        if (!isCurrent()) return false
        publish({ status: 'DOWNLOADING_MEDIA', completed: index, total: candidates.length })
        const item = manifest.find((entry) => String(entry.providerExerciseId) === candidate.externalId)!
        const media = candidate.media.find((entry) => entry.type === 'IMAGE' && entry.remoteUrl === item.imageUrl)
        if (!media) {
          if (item.mediaRequirement === 'REQUIRED') {
            failures.push({ intentKey: item.intentKey, name: item.reviewedPtBrName, reason: 'Mídia obrigatória ausente ou divergente.' })
            continue
          }
          downloadedCandidates.push(withoutImage(candidate))
          continue
        }
        if (!hasValidMediaAttribution(item, media)) {
          if (item.mediaRequirement === 'OPTIONAL') downloadedCandidates.push(withoutImage(candidate))
          else failures.push({ intentKey: item.intentKey, name: item.reviewedPtBrName, reason: 'Atribuição da mídia inválida.' })
          continue
        }

        try {
          const extension = extensionFor(media.remoteUrl)
          const name = `wger-${candidate.externalId}-${media.externalId}.${extension}`
          const destination = new File(importDirectory, name)
          let cacheValid = false
          if (destination.exists) {
            try {
              const bytes = new Uint8Array(await destination.arrayBuffer())
              if (!isCurrent()) return false
              validateImagePayload(media.mimeType, bytes, totalBytes)
              cacheValid = true
            } catch (error) {
              if (!isCurrent()) return false
              if (destination.exists) destination.delete()
            }
          }
          if (cacheValid) {
            downloadedCandidates.push(withLocalImage(candidate, media, destination.uri))
            continue
          }

          const staged = new File(temporaryDirectory, name)
          ownedFiles.current.add(staged)
          const bytes = await fetchImage(media.remoteUrl, controller.signal, totalBytes, media.mimeType)
          if (!isCurrent()) return false
          staged.write(bytes)
          if (!isCurrent()) return false
          if (destination.exists) destination.delete()
          ownedFiles.current.add(destination)
          await staged.move(destination)
          if (!isCurrent()) return false
          ownedFiles.current.delete(staged)
          totalBytes += bytes.byteLength
          downloadedCandidates.push(withLocalImage(candidate, media, destination.uri))
        } catch (error) {
          if (!isCurrent()) return false
          if (item.mediaRequirement === 'OPTIONAL') downloadedCandidates.push(withoutImage(candidate))
          else failures.push({ intentKey: item.intentKey, name: item.reviewedPtBrName, reason: `Mídia indisponível: ${messageFrom(error)}` })
        }
      }
      if (!isCurrent()) return false
      if (temporaryDirectory.exists) temporaryDirectory.delete()
      ownedDirectories.current.delete(temporaryDirectory)
      candidates.length = 0
      candidates.push(...downloadedCandidates)
      validCandidates.current = candidates
      unavailable.current = failures

      if (failures.length) {
        if (!candidates.length) {
          clearOwnedFiles()
          releaseOperation()
          publish({ status: 'ERROR', message: 'Nenhum exercício do pacote está disponível para importação.' })
          return false
        }
        if (!isCurrent()) return false
        publish({ status: 'AWAITING_PARTIAL_CONFIRMATION', valid: candidates.length, unavailable: failures })
        Alert.alert(
          'Parte do pacote indisponível',
          failures.map((item) => `${item.name}: ${item.reason}`).join('\n'),
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => { if (isCurrent()) invalidateOperation(operationId) } },
            { text: 'Importar disponíveis', onPress: () => { if (isCurrent()) void importAvailable(operationId) } },
          ],
        )
        return false
      }
      return commit(candidates, 0, countWithoutDemo(candidates), operationId, controller)
    } catch (error) {
      if (!isCurrent()) return false
      clearOwnedFiles()
      releaseOperation()
      if (controller.signal.aborted || (error instanceof WgerHttpError && error.code === 'ABORTED')) {
        publish({ status: 'IDLE' })
        return false
      }
      publish({ status: 'ERROR', message: messageFrom(error) })
      return false
    }
  }, [clearOwnedFiles, commit, importAvailable, invalidateOperation, provider, publish, releaseOperation])

  const cancel = useCallback(() => {
    if (!activeRef.current || stateRef.current.status === 'COMMITTING') return false
    return invalidateOperation(operationIdRef.current)
  }, [invalidateOperation])

  const retryRefresh = useCallback(async () => {
    if (activeRef.current || stateRef.current.status !== 'SUCCESS_WITH_WARNING') return false
    const previous = stateRef.current
    const operationId = operationIdRef.current + 1
    operationIdRef.current = operationId
    activeRef.current = true
    try {
      const refreshed = await onImported()
      if (!mountedRef.current || operationIdRef.current !== operationId) return false
      if (refreshed === false) throw new Error(POST_COMMIT_REFRESH_WARNING)
      releaseOperation()
      publish({ status: 'SUCCESS', imported: previous.imported, skipped: previous.skipped, withoutDemo: previous.withoutDemo })
      return true
    } catch {
      if (operationIdRef.current === operationId) releaseOperation()
      return false
    }
  }, [onImported, publish, releaseOperation])

  return { state, run, cancel, importAvailable, retryRefresh }
}

export function validateCurrentEntry(item: ApprovedWgerExercise, candidate: ExternalExerciseCandidate) {
  if (candidate.provider !== item.provider || candidate.externalId !== String(item.providerExerciseId)) return 'Identidade do provider divergente.'
  const raw = object(candidate.original)
  const rawName = translationName(raw, 2)
  if (rawName !== item.originalName) return 'Nome original divergente.'
  if (object(raw.category).name !== item.expectedCategory) return 'Categoria divergente.'
  const muscles = array(raw.muscles).map((value) => object(value).name_en || object(value).name).filter(Boolean)
  if (JSON.stringify(muscles) !== JSON.stringify(item.expectedPrimaryMuscles)) return 'Músculo principal divergente.'
  const equipment = array(raw.equipment).map((value) => object(value).name).filter(Boolean)
  if (JSON.stringify(equipment) !== JSON.stringify(item.expectedEquipment)) return 'Equipamento divergente.'
  const license = object(raw.license)
  if (String(license.full_name ?? '').trim() !== item.license || license.url !== item.licenseUrl) return 'Licença divergente.'
  if (!/^https:\/\//.test(candidate.sourceUrl) || !candidate.licenseUrl?.startsWith('https://')) return 'Fonte ou licença sem HTTPS.'
  if (!candidate.description.trim() && !candidate.instructions.trim()) return 'Conteúdo do provider sem descrição ou instruções.'
  const image = candidate.media.find((media) => media.type === 'IMAGE' && media.remoteUrl === item.imageUrl)
  if (item.mediaRequirement === 'REQUIRED' && !image) return 'Mídia obrigatória ausente ou divergente.'
  if (image && !hasValidMediaAttribution(item, image) && item.mediaRequirement === 'REQUIRED') return 'Atribuição da mídia inválida.'
  return null
}

export function validateImagePayload(mimeType: string | null, bytes: Uint8Array, totalBytes: number) {
  const mime = mimeType?.split(';')[0]?.trim().toLowerCase()
  if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('MIME de imagem inválido.')
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Mídia excede o limite de 8 MB.')
  if (totalBytes + bytes.byteLength > MAX_IMPORT_IMAGE_BYTES) throw new Error('A mídia excede o limite total de 150 MB.')
  if (!matchesImageSignature(mime, bytes)) throw new Error('Conteúdo da imagem não corresponde ao MIME declarado.')
}

async function fetchImage(url: string, signal: AbortSignal, totalBytes: number, expectedMime: string | null) {
  if (!/^https:\/\//.test(url)) throw new Error('URL de mídia insegura.')
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Resposta HTTP inválida (${response.status}).`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  validateImagePayload(response.headers.get('content-type') ?? expectedMime, bytes, totalBytes)
  return bytes
}

function isCurrentOperation(operationId: number, signal: AbortSignal, mounted: boolean, currentId: number) {
  return mounted && currentId === operationId && !signal.aborted
}

function hasValidMediaAttribution(item: ApprovedWgerExercise, media: ExternalExerciseCandidate['media'][number]) {
  return media.licenseName === item.license && media.licenseUrl === item.licenseUrl
    && (Boolean(media.author?.trim()) || Boolean(media.sourceUrl?.startsWith('https://')))
}

function matchesImageSignature(mime: string, bytes: Uint8Array) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

function withLocalImage(candidate: ExternalExerciseCandidate, media: ExternalExerciseCandidate['media'][number], localUri: string) {
  return {
    ...candidate,
    media: candidate.media.map((entry) => entry === media
      ? { ...entry, localUri, downloadedAt: entry.downloadedAt ?? new Date().toISOString() }
      : entry),
  }
}

function withoutImage(candidate: ExternalExerciseCandidate) {
  return {
    ...candidate,
    media: candidate.media.filter((entry) => entry.type !== 'IMAGE'),
    warnings: [...candidate.warnings, 'Sem demonstração visual'],
  }
}

function countWithoutDemo(candidates: ExternalExerciseCandidate[]) {
  return candidates.filter((candidate) => candidate.warnings.includes('Sem demonstração visual')).length
}

function extensionFor(url: string) {
  return url.match(/\.(png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() ?? 'img'
}

function translationName(raw: Record<string, unknown>, language: number) {
  return array(raw.translations).map(object).find((item) => item.language === language)?.name
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function object(value: unknown): Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, any> : {}
}
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'Falha no pacote recomendado.' }

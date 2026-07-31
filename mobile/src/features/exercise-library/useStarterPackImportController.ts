import { Alert } from 'react-native'
import { useCallback, useRef, useState } from 'react'
import { Directory, File, Paths } from 'expo-file-system'
import {
  WGER_STARTER_PACK,
  validateWgerStarterPackManifest,
  type ApprovedWgerExercise,
  type ExternalExerciseCandidate,
  type ExternalExerciseImportRepository,
} from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError } from '@training/training-wger'

export type StarterPackImportState =
  | { status: 'IDLE' }
  | { status: 'FETCHING'; completed: number; total: number }
  | { status: 'DOWNLOADING_MEDIA'; completed: number; total: number }
  | { status: 'VALIDATING'; total: number }
  | { status: 'AWAITING_PARTIAL_CONFIRMATION'; valid: number; unavailable: PackFailure[] }
  | { status: 'COMMITTING'; total: number }
  | { status: 'SUCCESS'; imported: number; skipped: number }
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
  const abort = useRef<AbortController | null>(null)
  const validCandidates = useRef<ExternalExerciseCandidate[]>([])
  const unavailable = useRef<PackFailure[]>([])
  const cleanupFailedImport = useRef<(() => void) | undefined>(undefined)

  const commit = useCallback(async (candidates: ExternalExerciseCandidate[], skipped: number, cleanup?: () => void) => {
    setState({ status: 'COMMITTING', total: candidates.length })
    try {
      const result = await imports.importSelected(candidates)
      await onImported()
      const imported = result.created + result.updated
      cleanupFailedImport.current = undefined
      setState({ status: 'SUCCESS', imported, skipped })
      return true
    } catch (error) {
      const cleanupOnFailure = cleanup ?? cleanupFailedImport.current
      cleanupOnFailure?.()
      cleanupFailedImport.current = undefined
      setState({ status: 'ERROR', message: messageFrom(error) })
      return false
    }
  }, [imports, onImported])

  const importAvailable = useCallback(() => commit(validCandidates.current, unavailable.current.length, cleanupFailedImport.current), [commit])

  const run = useCallback(async () => {
    if (state.status === 'FETCHING' || state.status === 'VALIDATING' || state.status === 'COMMITTING') return false
    const manifest = validateWgerStarterPackManifest(WGER_STARTER_PACK)
    const controller = new AbortController()
    abort.current?.abort()
    abort.current = controller
    const candidates: ExternalExerciseCandidate[] = []
    const failures: PackFailure[] = []
    try {
      for (const [index, item] of manifest.entries()) {
        setState({ status: 'FETCHING', completed: index, total: manifest.length })
        const candidate = await provider.findByExternalId(String(item.providerExerciseId), 'pt-br', controller.signal)
        const failure = candidate ? validateCurrentEntry(item, candidate) : 'ID não encontrado no Wger.'
        if (failure) failures.push({ intentKey: item.intentKey, name: item.reviewedPtBrName, reason: failure })
        else candidates.push(candidate!)
      }
      setState({ status: 'VALIDATING', total: manifest.length })
      const downloadedCandidates: ExternalExerciseCandidate[] = []
      const importDirectory = new Directory(Paths.document, 'training-app', 'wger-media')
      importDirectory.create({ intermediates: true, idempotent: true })
      const temporaryDirectory = new Directory(Paths.cache, `starter-pack-${Date.now()}`)
      temporaryDirectory.create({ intermediates: true, idempotent: true })
      const finalFiles: File[] = []
      for (const [index, candidate] of candidates.entries()) {
        setState({ status: 'DOWNLOADING_MEDIA', completed: index, total: candidates.length })
        const item = manifest.find((entry) => String(entry.providerExerciseId) === candidate.externalId)!
        try {
          const media = candidate.media.find((entry) => entry.type === 'IMAGE' && entry.remoteUrl === item.imageUrl)
          if (item.mediaRequirement === 'REQUIRED' && media) {
            if (!/^https:\/\//.test(media.remoteUrl)) throw new Error('URL de mídia insegura.')
            const extension = media.remoteUrl.match(/\.(png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() ?? 'img'
            const name = `wger-${candidate.externalId}-${media.externalId}.${extension}`
            const staged = new File(temporaryDirectory, name)
            await File.downloadFileAsync(media.remoteUrl, staged, { idempotent: true })
            const size = staged.info().size ?? 0
            if (!size || size > 10 * 1024 * 1024) throw new Error('Mídia excede o limite de 10 MB.')
            const destination = new File(importDirectory, name)
            await staged.move(destination)
            finalFiles.push(destination)
            downloadedCandidates.push({ ...candidate, media: candidate.media.map((entry) => entry === media
              ? { ...entry, localUri: destination.uri, downloadedAt: new Date().toISOString() }
              : entry) })
          } else {
            downloadedCandidates.push(candidate)
          }
        } catch (error) {
          failures.push({ intentKey: item.intentKey, name: item.reviewedPtBrName, reason: `Mídia indisponível: ${messageFrom(error)}` })
        }
      }
      if (temporaryDirectory.exists) temporaryDirectory.delete()
      candidates.length = 0
      candidates.push(...downloadedCandidates)
      validCandidates.current = candidates
      unavailable.current = failures
      if (failures.length) {
        if (!candidates.length) {
          cleanupFailedImport.current?.()
          cleanupFailedImport.current = undefined
          setState({ status: 'ERROR', message: 'Nenhum exercício do pacote está disponível para importação.' })
          return false
        }
        setState({ status: 'AWAITING_PARTIAL_CONFIRMATION', valid: candidates.length, unavailable: failures })
        Alert.alert(
          'Parte do pacote indisponível',
          failures.map((item) => `${item.name}: ${item.reason}`).join('\n'),
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => { cleanupFailedImport.current?.(); cleanupFailedImport.current = undefined; setState({ status: 'IDLE' }) } },
            { text: 'Importar disponíveis', onPress: () => void importAvailable() },
          ],
        )
        return false
      }
      cleanupFailedImport.current = () => finalFiles.forEach((file) => { if (file.exists) file.delete() })
      return commit(candidates, 0, cleanupFailedImport.current)
    } catch (error) {
      if (error instanceof WgerHttpError && error.code === 'ABORTED') return false
      setState({ status: 'ERROR', message: messageFrom(error) })
      return false
    }
  }, [commit, importAvailable, state.status, provider])

  const cancel = useCallback(() => {
    abort.current?.abort()
    setState({ status: 'IDLE' })
  }, [])

  return { state, run, cancel, importAvailable }
}

function validateCurrentEntry(item: ApprovedWgerExercise, candidate: ExternalExerciseCandidate) {
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
  const image = candidate.media.find((media) => media.type === 'IMAGE' && media.remoteUrl === item.imageUrl)
  if (item.mediaRequirement === 'REQUIRED' && !image) return 'Mídia obrigatória ausente ou divergente.'
  if (!candidate.description.trim() && !candidate.instructions.trim()) return 'Conteúdo do provider sem descrição ou instruções.'
  return null
}

function translationName(raw: Record<string, unknown>, language: number) {
  return array(raw.translations).map(object).find((item) => item.language === language)?.name
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function object(value: unknown): Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, any> : {}
}
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'Falha no pacote recomendado.' }

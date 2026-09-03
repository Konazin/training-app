import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ExerciseLibraryRepository,
  ExerciseProviderId,
  ExternalExerciseCandidate,
  ExternalExerciseCatalogProvider,
  ExternalExerciseCatalogQuery,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { exerciseIdentity } from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError, type WgerLanguageOption } from '@training/training-wger'
import { ExerciseDbClient, ExerciseDbError } from '@training/training-exercisedb'
import type { ToastKind } from '../../components/Toast'

export const DEFAULT_WGER_QUERY: ExternalExerciseCatalogQuery = {
  page: 1,
  pageSize: 20,
  language: 'auto',
  fallbackLanguage: 'en',
  text: '',
  categoryIds: [],
  muscleIds: [],
  equipmentIds: [],
  onlyWithImage: false,
  onlyWithVideo: false,
}

export type CatalogProviders = {
  EXERCISEDB: ExerciseDbClient
  WGER: WgerExerciseCatalogProvider
}

export function createCatalogProviders(): CatalogProviders {
  return {
    EXERCISEDB: new ExerciseDbClient(),
    WGER: new WgerExerciseCatalogProvider(),
  }
}

export function useWgerIntegrationController(
  imports: ExternalExerciseImportRepository,
  exercises: ExerciseLibraryRepository,
  onImported: () => Promise<unknown>,
  providerId: ExerciseProviderId,
  providerOverrides?: CatalogProviders,
) {
  const providers = useRef(providerOverrides ?? createCatalogProviders()).current
  const provider: ExternalExerciseCatalogProvider = providers[providerId]
  const [query, setQuery] = useState(DEFAULT_WGER_QUERY)
  const [items, setItems] = useState<ExternalExerciseCandidate[]>([])
  const [selected, setSelected] = useState<Map<string, ExternalExerciseCandidate>>(new Map())
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<ExternalExerciseCandidate | null>(null)
  const [phase, setPhase] = useState<'ready' | 'loading' | 'results' | 'importing' | 'success' | 'partial' | 'error' | 'offline'>('ready')
  const [message, setMessage] = useState<{ text: string; kind: ToastKind }>({ text: '', kind: 'info' })
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [languages, setLanguages] = useState<WgerLanguageOption[]>([])
  const [languagesLoading, setLanguagesLoading] = useState(false)
  const [languagesFailed, setLanguagesFailed] = useState(false)
  const languageRequest = useRef<Promise<WgerLanguageOption[]> | null>(null)
  const requestId = useRef(0)
  const abort = useRef<AbortController | null>(null)

  const loadImportedCount = useCallback(async () => {
    const [wger, exercisedb] = await Promise.all([
      exercises.list({ source: 'WGER', includeArchived: true }),
      exercises.list({ source: 'EXERCISEDB', includeArchived: true }),
    ])
    setImportedCount(wger.length + exercisedb.length)
  }, [exercises])

  useEffect(() => {
    void loadImportedCount()
    return () => {
      requestId.current += 1
      abort.current?.abort()
    }
  }, [loadImportedCount])

  useEffect(() => {
    requestId.current += 1
    abort.current?.abort()
    setQuery(DEFAULT_WGER_QUERY)
    setItems([])
    setSelected(new Map())
    setExisting(new Set())
    setPreview(null)
    setTotal(0)
    setHasNext(false)
    setHasPrevious(false)
    setLanguages([])
    setLanguagesFailed(false)
    setMessage({ text: '', kind: 'info' })
    setPhase('ready')
  }, [providerId])

  const search = useCallback(async (page = 1) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const currentRequest = ++requestId.current
    const nextQuery = { ...query, page }
    const requestQuery = { ...nextQuery, language: query.language === 'auto' ? deviceLocale() : query.language }
    setQuery(nextQuery)
    setPhase('loading')
    setMessage({ text: '', kind: 'info' })
    try {
      const result = await provider.search(requestQuery, controller.signal)
      if (requestId.current !== currentRequest) return false
      const previewExisting = await imports.previewExisting(result.items)
      if (requestId.current !== currentRequest) return false
      setItems(result.items)
      setExisting(new Set(previewExisting.filter((item) => item.alreadyImported).map((item) => exerciseIdentity(item.provider, item.externalId))))
      setTotal(result.total)
      setHasNext(result.hasNext)
      setHasPrevious(result.hasPrevious)
      setPhase('results')
      if (!result.items.length) setMessage({ text: 'Nenhum exercício encontrado nesta página.', kind: 'warning' })
      return true
    } catch (error) {
      if (isAbortedError(error)) return false
      if (requestId.current !== currentRequest) return false
      const offline = isOfflineError(error)
      setPhase(offline ? 'offline' : 'error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [imports, provider, query])

  const loadLanguages = useCallback(async () => {
    if (providerId !== 'WGER') return []
    if (languages.length) return languages
    if (!languageRequest.current) {
      setLanguagesFailed(false)
      setLanguagesLoading(true)
      languageRequest.current = providers.WGER.getLanguages().then((result) => {
        setLanguages(result)
        setLanguagesFailed(false)
        return result
      }).catch(() => {
        setLanguagesFailed(true)
        return []
      }).finally(() => {
        languageRequest.current = null
        setLanguagesLoading(false)
      })
    }
    return languageRequest.current
  }, [languages, providerId, providers])

  const toggle = useCallback((candidate: ExternalExerciseCandidate) => {
    setSelected((current) => {
      const next = new Map(current)
      const key = exerciseIdentity(candidate.provider, candidate.externalId)
      if (next.has(key)) next.delete(key)
      else next.set(key, candidate)
      return next
    })
  }, [])

  const selectPage = useCallback(() => {
    setSelected((current) => new Map([...current, ...items.map((item) => [exerciseIdentity(item.provider, item.externalId), item] as const)]))
  }, [items])

  const clearSelection = useCallback(() => setSelected(new Map()), [])

  const savePreview = useCallback((candidate: ExternalExerciseCandidate) => {
    setItems((current) => current.map((item) => exerciseIdentity(item.provider, item.externalId) === exerciseIdentity(candidate.provider, candidate.externalId) ? candidate : item))
    setSelected((current) => {
      const key = exerciseIdentity(candidate.provider, candidate.externalId)
      if (!current.has(key)) return current
      return new Map(current).set(key, candidate)
    })
    setPreview(null)
  }, [])

  const importSelected = useCallback(async () => {
    if (!selected.size) return false
    setPhase('importing')
    try {
      const result = await imports.importSelected([...selected.values()])
      await Promise.all([onImported(), loadImportedCount()])
      setExisting((current) => new Set([...current, ...selected.keys()]))
      setSelected(new Map())
      const partial = result.failed > 0 || result.skipped > 0
      setPhase(partial ? 'partial' : 'success')
      setMessage({
        text: `${result.created} criado(s), ${result.updated} atualizado(s), ${result.unchanged} inalterado(s).`,
        kind: partial ? 'warning' : 'success',
      })
      return true
    } catch (error) {
      setPhase('error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [imports, loadImportedCount, onImported, selected])

  const refreshImported = useCallback(async () => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const currentRequest = ++requestId.current
    setPhase('loading')
    try {
      const local = (await Promise.all([
        exercises.list({ source: 'WGER', includeArchived: true }),
        exercises.list({ source: 'EXERCISEDB', includeArchived: true }),
      ])).flat()
      const refreshed: ExternalExerciseCandidate[] = []
      const warnings: string[] = []
      const groups = new Map<string, typeof local>()
      for (const item of local) groups.set(item.source, [...(groups.get(item.source) ?? []), item])
      for (const [sourceId, group] of groups) {
        const source = providers[sourceId as ExerciseProviderId]
        if (!source) continue
        for (const item of group) {
          if (!item.externalId) continue
          try {
            const candidate = await source.findByExternalId(item.externalId, 'pt-br', controller.signal)
            if (requestId.current !== currentRequest) return false
            if (candidate) refreshed.push(candidate)
            else warnings.push(`${item.name}: não encontrado; cópia local mantida.`)
          } catch (error) {
            if (controller.signal.aborted) return false
            if (isAbortedError(error)) return false
            warnings.push(`${item.name}: fonte indisponível; cópia local mantida.`)
          }
        }
      }
      const result = await imports.importSelected(refreshed)
      await Promise.all([onImported(), loadImportedCount()])
      const partial = warnings.length > 0
      setPhase(partial ? 'partial' : 'success')
      setMessage({
        text: `${result.updated} atualizado(s), ${result.unchanged} inalterado(s).${warnings.length ? ` ${warnings.length} aviso(s).` : ''}`,
        kind: partial ? 'warning' : 'success',
      })
      return true
    } catch (error) {
      if (isAbortedError(error)) return false
      const offline = isOfflineError(error)
      setPhase(offline ? 'offline' : 'error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [exercises, imports, loadImportedCount, onImported, providers])

  return {
    query,
    setQuery,
    items,
    selected,
    existing,
    preview,
    setPreview,
    phase,
    message,
    total,
    hasNext,
    hasPrevious,
    importedCount,
    languages,
    languagesLoading,
    languagesFailed,
    providerId,
    loadLanguages,
    search,
    toggle,
    selectPage,
    clearSelection,
    savePreview,
    importSelected,
    refreshImported,
    cancel: () => abort.current?.abort(),
  }
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Falha inesperada na integração de catálogo.'
}

function isAbortedError(error: unknown) {
  return (error instanceof WgerHttpError || error instanceof ExerciseDbError) && error.code === 'ABORTED'
}

function isOfflineError(error: unknown) {
  return (error instanceof WgerHttpError || error instanceof ExerciseDbError) && error.code === 'OFFLINE'
}

export function deviceLocale() {
  return Intl.DateTimeFormat().resolvedOptions().locale.replace('_', '-').toLowerCase() || 'en'
}

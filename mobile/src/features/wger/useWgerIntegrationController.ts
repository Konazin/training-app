import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ExerciseLibraryRepository,
  ExternalExerciseCandidate,
  ExternalExerciseCatalogQuery,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError } from '@training/training-wger'
import { ExerciseDbClient } from '@training/training-exercisedb'
import type { ToastKind } from '../../components/Toast'

export const DEFAULT_WGER_QUERY: ExternalExerciseCatalogQuery = {
  page: 1,
  pageSize: 20,
  language: 'pt-br',
  fallbackLanguage: 'en',
  text: '',
  categoryIds: [],
  muscleIds: [],
  equipmentIds: [],
  onlyWithImage: false,
  onlyWithVideo: false,
}

export function useWgerIntegrationController(
  imports: ExternalExerciseImportRepository,
  exercises: ExerciseLibraryRepository,
  onImported: () => Promise<unknown>,
  providerOverride?: WgerExerciseCatalogProvider | ExerciseDbClient,
) {
  const provider = useRef(providerOverride ?? new ExerciseDbClient()).current
  const fallback = useRef(new WgerExerciseCatalogProvider()).current
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

  const search = useCallback(async (page = 1) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const currentRequest = ++requestId.current
    const nextQuery = { ...query, page }
    setQuery(nextQuery)
    setPhase('loading')
    setMessage({ text: '', kind: 'info' })
    try {
      let result
      try { result = await provider.search(nextQuery, controller.signal) }
      catch (error) {
        if (provider.descriptor.id !== 'EXERCISEDB') throw error
        setMessage({ text: 'ExerciseDB indisponível; tentando Wger…', kind: 'warning' })
        result = await fallback.search(nextQuery, controller.signal)
      }
      if (requestId.current !== currentRequest) return false
      const previewExisting = await imports.previewExisting(result.items)
      if (requestId.current !== currentRequest) return false
      setItems(result.items)
      setExisting(new Set(previewExisting.filter((item) => item.alreadyImported).map((item) => item.externalId)))
      setTotal(result.total)
      setHasNext(result.hasNext)
      setHasPrevious(result.hasPrevious)
      setPhase('results')
      if (!result.items.length) setMessage({ text: 'Nenhum exercício encontrado nesta página.', kind: 'warning' })
      return true
    } catch (error) {
      if (error instanceof WgerHttpError && error.code === 'ABORTED') return false
      if (requestId.current !== currentRequest) return false
      const offline = error instanceof WgerHttpError && error.code === 'OFFLINE'
      setPhase(offline ? 'offline' : 'error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [fallback, imports, provider, query])

  const toggle = useCallback((candidate: ExternalExerciseCandidate) => {
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(candidate.externalId)) next.delete(candidate.externalId)
      else next.set(candidate.externalId, candidate)
      return next
    })
  }, [])

  const selectPage = useCallback(() => {
    setSelected((current) => new Map([...current, ...items.map((item) => [item.externalId, item] as const)]))
  }, [items])

  const clearSelection = useCallback(() => setSelected(new Map()), [])

  const savePreview = useCallback((candidate: ExternalExerciseCandidate) => {
    setItems((current) => current.map((item) => item.externalId === candidate.externalId ? candidate : item))
    setSelected((current) => {
      if (!current.has(candidate.externalId)) return current
      return new Map(current).set(candidate.externalId, candidate)
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
      const local = await exercises.list({ source: 'WGER', includeArchived: true })
      const refreshed: ExternalExerciseCandidate[] = []
      const warnings: string[] = []
      for (const item of local) {
        if (!item.externalId) continue
        const candidate = await provider.findByExternalId(item.externalId, 'pt-br', controller.signal)
        if (requestId.current !== currentRequest) return false
        if (candidate) refreshed.push(candidate)
        else warnings.push(`${item.name}: não encontrado no Wger; cópia local mantida.`)
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
      if (error instanceof WgerHttpError && error.code === 'ABORTED') return false
      const offline = error instanceof WgerHttpError && error.code === 'OFFLINE'
      setPhase(offline ? 'offline' : 'error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [exercises, imports, loadImportedCount, onImported, provider])

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
  return error instanceof Error ? error.message : 'Falha inesperada na integração Wger.'
}

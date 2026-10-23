import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ExerciseLibraryRepository,
  ExternalExerciseCandidate,
  ExternalExerciseCatalogPage,
  ExternalExerciseCatalogQuery,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { exerciseIdentity } from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError, type WgerLanguageOption } from '@training/training-wger'
import { ExerciseDbClient } from '@training/training-exercisedb'
import type { ToastKind } from '../../components/Toast'

export type CatalogSource = 'EXERCISEDB' | 'WGER' | 'BOTH'

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
  const [languages, setLanguages] = useState<WgerLanguageOption[]>([])
  const [languagesLoading, setLanguagesLoading] = useState(false)
  const [languagesFailed, setLanguagesFailed] = useState(false)
  const languageRequest = useRef<Promise<WgerLanguageOption[]> | null>(null)
  const requestId = useRef(0)
  const committedQuery = useRef(DEFAULT_WGER_QUERY)
  const cursors = useRef<Map<number, string>>(new Map())
  const [source, setSource] = useState<CatalogSource>('EXERCISEDB')
  const committedSource = useRef<CatalogSource>('EXERCISEDB')
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

  const search = useCallback(async (requestedPage = 1, overrides: Partial<ExternalExerciseCatalogQuery> = {}, sourceOverride?: CatalogSource) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const currentRequest = ++requestId.current
    // A primeira página usa o que está na tela; as demais continuam a consulta já executada,
    // para que editar o campo de busca não troque o resultado da paginação.
    const base = requestedPage === 1 ? { ...query, ...overrides } : { ...committedQuery.current, ...overrides }
    const activeSource = requestedPage === 1 ? (sourceOverride ?? source) : committedSource.current
    const wantsCatalog = activeSource !== 'WGER'
    // ExerciseDB pagina por cursor: sem cursor conhecido a única página alcançável é a primeira.
    const cursor = requestedPage > 1 ? cursors.current.get(requestedPage) : undefined
    const needsCursor = wantsCatalog && provider.descriptor?.id === 'EXERCISEDB'
    const catalogExhausted = needsCursor && requestedPage > 1 && !cursor
    // Em "Ambos", a fonte esgotada só deixa de contribuir; sozinha, recomeça na primeira página.
    const page = catalogExhausted && activeSource === 'EXERCISEDB' ? 1 : requestedPage
    const useCatalog = wantsCatalog && !(catalogExhausted && activeSource === 'BOTH')
    if (page === 1) cursors.current = new Map()
    const nextQuery = { ...base, page }
    const requestQuery = {
      ...nextQuery,
      language: base.language === 'auto' ? deviceLocale() : base.language,
    }
    // Paginar não pode sobrescrever o que o usuário digitou depois da busca.
    setQuery((current) => page === 1 ? nextQuery : { ...current, page })
    setPhase('loading')
    setMessage({ text: '', kind: 'info' })
    try {
      const jobs: { label: string; run: () => ReturnType<typeof provider.search>; cursorSource: boolean }[] = []
      if (useCatalog) jobs.push({ label: 'ExerciseDB', cursorSource: needsCursor, run: () => provider.search({ ...requestQuery, ...(cursor ? { cursor } : {}) }, controller.signal) })
      if (activeSource !== 'EXERCISEDB' && provider !== fallback) jobs.push({ label: 'Wger', cursorSource: false, run: () => fallback.search(requestQuery, controller.signal) })
      const settled = await Promise.allSettled(jobs.map((job) => job.run()))
      const failed = settled.flatMap((entry, index) => entry.status === 'rejected' ? [{ label: jobs[index]!.label, reason: entry.reason as unknown }] : [])
      if (failed.length === settled.length) throw failed[0]!.reason
      const pages = settled.flatMap((entry, index) => entry.status === 'fulfilled' ? [{ value: entry.value, job: jobs[index]! }] : [])
      if (requestId.current !== currentRequest) return false
      committedQuery.current = nextQuery
      committedSource.current = activeSource
      if (requestedPage === 1) setSource(activeSource)
      for (const { value, job } of pages) {
        // O nextCursor do Wger é uma URL e não serve ao ExerciseDB.
        if (job.cursorSource && value.nextCursor) cursors.current.set(page + 1, value.nextCursor)
      }
      const result = mergePages(pages.map((entry) => entry.value), page)
      if (failed.length) {
        setMessage({ text: `${failed.map((item) => item.label).join(', ')} indisponível; mostrando apenas ${pages.map((entry) => entry.job.label).join(', ')}.`, kind: 'warning' })
      }
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
      if (requestId.current !== currentRequest) return false
      if (controller.signal.aborted || (error instanceof WgerHttpError && error.code === 'ABORTED')) {
        setPhase('results')
        return false
      }
      const offline = error instanceof WgerHttpError && error.code === 'OFFLINE'
      setPhase(offline ? 'offline' : 'error')
      setMessage({ text: messageFrom(error), kind: 'error' })
      return false
    }
  }, [fallback, imports, provider, query, source])

  const loadLanguages = useCallback(async () => {
    if (languages.length) return languages
    if (!languageRequest.current) {
      setLanguagesFailed(false)
      setLanguagesLoading(true)
      languageRequest.current = fallback.getLanguages().then((result) => {
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
  }, [fallback, languages])

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
      const result = await imports.importSelected([...selected.values()], { restoreArchived: true })
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
        const source = sourceId === 'WGER' ? fallback : provider
        for (const item of group) {
          if (!item.externalId) continue
          try {
            const candidate = await source.findByExternalId(item.externalId, 'pt-br', controller.signal)
            if (requestId.current !== currentRequest) return false
            if (candidate) refreshed.push(candidate)
            else warnings.push(`${item.name}: não encontrado; cópia local mantida.`)
          } catch (error) {
            if (controller.signal.aborted) return false
            if (error instanceof WgerHttpError && error.code === 'ABORTED') return false
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
    source,
    setSource,
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
  return error instanceof Error ? error.message : 'Falha inesperada na integração Wger.'
}

export function deviceLocale() {
  return Intl.DateTimeFormat().resolvedOptions().locale.replace('_', '-').toLowerCase() || 'en'
}

/** Intercala os resultados de várias fontes para que nenhuma domine a página. */
function mergePages(pages: ExternalExerciseCatalogPage[], page: number): ExternalExerciseCatalogPage {
  if (pages.length === 1) return pages[0]!
  const items: ExternalExerciseCandidate[] = []
  const longest = Math.max(...pages.map((entry) => entry.items.length))
  for (let index = 0; index < longest; index += 1) {
    for (const entry of pages) if (entry.items[index]) items.push(entry.items[index]!)
  }
  return {
    items,
    page,
    pageSize: pages.reduce((total, entry) => total + entry.pageSize, 0),
    total: pages.reduce((total, entry) => total + entry.total, 0),
    hasNext: pages.some((entry) => entry.hasNext),
    hasPrevious: page > 1,
  }
}

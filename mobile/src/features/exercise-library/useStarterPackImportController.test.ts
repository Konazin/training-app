import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ExternalExerciseCandidate,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { WGER_STARTER_PACK } from '@training/training-domain'
import { WgerExerciseCatalogProvider } from '@training/training-wger'
import {
  MAX_IMAGE_BYTES,
  MAX_IMPORT_IMAGE_BYTES,
  useStarterPackImportController,
  validateCurrentEntry,
  validateImagePayload,
} from './useStarterPackImportController'

const fileSystem = vi.hoisted(() => {
  const files = new Map<string, Uint8Array>()
  const directories = new Set<string>()
  const uri = (value: unknown) => typeof value === 'string' ? value : (value as { uri: string }).uri
  const join = (parts: unknown[]) => parts.map((part, index) => index === 0
    ? uri(part).replace(/\/+$/, '')
    : uri(part).replace(/^\/+/, '')).join('/')
  class MockDirectory {
    readonly uri: string
    constructor(...parts: unknown[]) { this.uri = join(parts) }
    get exists() { return directories.has(this.uri) }
    create() { directories.add(this.uri) }
    delete() {
      directories.delete(this.uri)
      for (const key of files.keys()) if (key.startsWith(`${this.uri}/`)) files.delete(key)
    }
  }
  class MockFile {
    readonly uri: string
    constructor(...parts: unknown[]) { this.uri = join(parts) }
    get exists() { return files.has(this.uri) }
    info() { return { exists: this.exists, size: files.get(this.uri)?.byteLength ?? 0 } }
    async arrayBuffer() { return new Uint8Array(files.get(this.uri) ?? []).buffer }
    write(value: Uint8Array) { files.set(this.uri, new Uint8Array(value)) }
    async move(destination: MockFile) {
      files.set(destination.uri, new Uint8Array(files.get(this.uri) ?? []))
      files.delete(this.uri)
    }
    delete() { files.delete(this.uri) }
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file:///document', cache: 'file:///cache' },
    files,
    directories,
    reset: () => { files.clear(); directories.clear() },
  }
})

const alerts = vi.hoisted(() => ({ buttons: [] as Array<{ text?: string; onPress?: () => void }> | undefined }))

vi.mock('expo-file-system', () => ({
  File: fileSystem.File,
  Directory: fileSystem.Directory,
  Paths: fileSystem.Paths,
}))
vi.mock('react-native', () => ({
  Alert: { alert: (_title: string, _message: string, buttons: typeof alerts.buttons) => { alerts.buttons = buttons } },
}))

beforeEach(() => {
  fileSystem.reset()
  alerts.buttons = undefined
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => imageResponse(url)))
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

describe('importação do pacote recomendado', () => {
  it('preserva mídia e informa sucesso com aviso quando o refresh pós-commit falha', async () => {
    const onImported = vi.fn(async () => { throw new Error('refresh indisponível') })
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, onImported, provider()))
    await act(async () => { await hook.current.run() })
    expect(hook.current.state.status).toBe('SUCCESS_WITH_WARNING')
    expect(hook.current.state).toMatchObject({ message: 'Exercícios importados, mas a tela não foi atualizada.' })
    expect(imports.importSelected).toHaveBeenCalledTimes(1)
    expect(fileSystem.files.size).toBe(40)
    hook.unmount()
  })

  it('repete somente o refresh pós-commit', async () => {
    const onImported = vi.fn()
      .mockRejectedValueOnce(new Error('refresh indisponível'))
      .mockResolvedValueOnce(undefined)
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, onImported, provider()))
    await act(async () => { await hook.current.run() })
    await act(async () => { expect(await hook.current.retryRefresh()).toBe(true) })
    expect(imports.importSelected).toHaveBeenCalledTimes(1)
    expect(onImported).toHaveBeenCalledTimes(2)
    expect(hook.current.state.status).toBe('SUCCESS')
    hook.unmount()
  })

  it('cancela durante download e limpa arquivos pertencentes à operação', async () => {
    let resolveFetch!: (value: unknown) => void
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn(() => pending))
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    const running = hook.current.run()
    await vi.waitFor(() => expect(hook.current.state.status).toBe('DOWNLOADING_MEDIA'))
    expect(hook.current.cancel()).toBe(true)
    resolveFetch(imageResponse(WGER_STARTER_PACK[0]!.imageUrl!))
    await act(async () => { await running })
    expect(imports.importSelected).not.toHaveBeenCalled()
    expect(fileSystem.files.size).toBe(0)
    expect(hook.current.state.status).toBe('IDLE')
    hook.unmount()
  })

  it('cancela durante o download da última imagem sem alterar o SQLite', async () => {
    const last = WGER_STARTER_PACK.at(-1)!
    let resolveFetch!: (value: unknown) => void
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn((url: string) => url === last.imageUrl ? pending : Promise.resolve(imageResponse(url))))
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    const running = hook.current.run()
    await vi.waitFor(() => expect(hook.current.state).toMatchObject({ status: 'DOWNLOADING_MEDIA', completed: 39 }))
    hook.current.cancel()
    resolveFetch(imageResponse(last.imageUrl!))
    await act(async () => { await running })
    expect(imports.importSelected).not.toHaveBeenCalled()
    expect(fileSystem.files.size).toBe(0)
    hook.unmount()
  })

  it('cancela a importação parcial e remove os downloads já feitos', async () => {
    const partialProvider = provider((item, index) => index === 0 ? null : candidate(item))
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, partialProvider))
    await act(async () => { await hook.current.run() })
    expect(hook.current.state.status).toBe('AWAITING_PARTIAL_CONFIRMATION')
    const cancel = alerts.buttons?.find((button) => button.text === 'Cancelar')?.onPress
    expect(cancel).toBeDefined()
    await act(async () => { cancel?.() })
    expect(imports.importSelected).not.toHaveBeenCalled()
    expect(fileSystem.files.size).toBe(0)
    expect(hook.current.state.status).toBe('IDLE')
    hook.unmount()
  })

  it('limpa arquivos novos quando o commit SQLite falha', async () => {
    const imports = importRepository()
    imports.importSelected = vi.fn(async () => { throw new Error('SQLite indisponível') })
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    await act(async () => { await hook.current.run() })
    expect(hook.current.state).toEqual({ status: 'ERROR', message: 'SQLite indisponível' })
    expect(fileSystem.files.size).toBe(0)
    hook.unmount()
  })

  it('não apaga nem baixa novamente um arquivo local válido existente', async () => {
    const item = WGER_STARTER_PACK[0]!
    const path = `file:///document/training-app/wger-media/wger-${item.providerExerciseId}-media-${item.providerExerciseId}.${extension(item.imageUrl!)}`
    fileSystem.files.set(path, imageBytes(item.imageUrl!))
    const fetchMock = vi.mocked(fetch)
    const hook = await renderHook(() => useStarterPackImportController(importRepository(), async () => undefined, provider()))
    await act(async () => { await hook.current.run() })
    expect(fetchMock).toHaveBeenCalledTimes(39)
    expect(fileSystem.files.get(path)).toEqual(imageBytes(item.imageUrl!))
    hook.unmount()
  })

  it('descarta cache corrompido e baixa novamente apenas esse item', async () => {
    const item = WGER_STARTER_PACK[0]!
    const path = mediaPath(item)
    fileSystem.files.set(path, new Uint8Array([1, 2, 3]))
    const fetchMock = vi.mocked(fetch)
    const hook = await renderHook(() => useStarterPackImportController(importRepository(), async () => undefined, provider()))
    await act(async () => { await hook.current.run() })
    expect(fetchMock).toHaveBeenCalledTimes(40)
    expect(fileSystem.files.get(path)).toEqual(imageBytes(item.imageUrl!))
    hook.unmount()
  })

  it('mantém caches válidos quando o redownload de outro item falha', async () => {
    const failed = WGER_STARTER_PACK[0]!
    const preserved = WGER_STARTER_PACK[1]!
    fileSystem.files.set(mediaPath(failed), new Uint8Array([1, 2, 3]))
    fileSystem.files.set(mediaPath(preserved), imageBytes(preserved.imageUrl!))
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === failed.imageUrl) throw new Error('offline')
      return imageResponse(url)
    }))
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    await act(async () => { await hook.current.run() })
    expect(hook.current.state).toMatchObject({ status: 'AWAITING_PARTIAL_CONFIRMATION', valid: 39 })
    expect(fileSystem.files.has(mediaPath(failed))).toBe(false)
    expect(fileSystem.files.get(mediaPath(preserved))).toEqual(imageBytes(preserved.imageUrl!))
    alerts.buttons?.find((button) => button.text === 'Importar disponíveis')?.onPress?.()
    await vi.waitFor(() => expect(imports.importSelected).toHaveBeenCalledTimes(1))
    hook.unmount()
  })

  it('torna a segunda importação idempotente e não baixa mídia novamente', async () => {
    const imports = importRepository()
    const fetchMock = vi.mocked(fetch)
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    await act(async () => { await hook.current.run() })
    await act(async () => { await hook.current.run() })
    expect(imports.importSelected).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledTimes(40)
    expect(fileSystem.files.size).toBe(40)
    expect(vi.mocked(imports.importSelected).mock.calls[1]![0]).toHaveLength(40)
    hook.unmount()
  })

  it('bloqueia nova execução durante DOWNLOADING_MEDIA', async () => {
    let resolveFetch!: (value: unknown) => void
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn(() => pending))
    const hook = await renderHook(() => useStarterPackImportController(importRepository(), async () => undefined, provider()))
    const running = hook.current.run()
    await vi.waitFor(() => expect(hook.current.state.status).toBe('DOWNLOADING_MEDIA'))
    expect(await hook.current.run()).toBe(false)
    hook.current.cancel()
    resolveFetch(imageResponse(WGER_STARTER_PACK[0]!.imageUrl!))
    await act(async () => { await running })
    hook.unmount()
  })

  it('bloqueia nova execução enquanto aguarda confirmação parcial', async () => {
    const hook = await renderHook(() => useStarterPackImportController(
      importRepository(), async () => undefined, provider((item, index) => index === 0 ? null : candidate(item)),
    ))
    await act(async () => { await hook.current.run() })
    expect(await hook.current.run()).toBe(false)
    alerts.buttons?.find((button) => button.text === 'Cancelar')?.onPress?.()
    hook.unmount()
  })

  it('rejeita MIME inválido', () => {
    expect(() => validateImagePayload('text/html', imageBytes('x.png'), 0)).toThrow('MIME de imagem inválido')
  })

  it('rejeita imagem acima de 8 MB', () => {
    expect(() => validateImagePayload('image/png', new Uint8Array(MAX_IMAGE_BYTES + 1), 0)).toThrow('8 MB')
  })

  it('rejeita o limite total de 150 MB', () => {
    expect(() => validateImagePayload('image/png', imageBytes('x.png'), MAX_IMPORT_IMAGE_BYTES)).toThrow('150 MB')
  })

  it('rejeita atribuição de mídia inválida', () => {
    const item = WGER_STARTER_PACK[0]!
    const invalid = candidate(item)
    invalid.media[0] = { ...invalid.media[0]!, licenseUrl: 'https://example.test/licenca', author: null, sourceUrl: null }
    expect(validateCurrentEntry(item, invalid)).toBe('Atribuição da mídia inválida.')
  })

  it('o cancelamento retorna ao estado seguro sem importar', async () => {
    let resolveFetch!: (value: unknown) => void
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn(() => pending))
    const hook = await renderHook(() => useStarterPackImportController(importRepository(), async () => undefined, provider()))
    const running = hook.current.run()
    await vi.waitFor(() => expect(hook.current.state.status).toBe('DOWNLOADING_MEDIA'))
    expect(hook.current.cancel()).toBe(true)
    resolveFetch(imageResponse(WGER_STARTER_PACK[0]!.imageUrl!))
    await act(async () => { await running })
    expect(hook.current.state.status).toBe('IDLE')
    hook.unmount()
  })

  it('não atualiza estado React depois da desmontagem', async () => {
    let resolveFirst!: (value: ExternalExerciseCandidate) => void
    const first = new Promise<ExternalExerciseCandidate>((resolve) => { resolveFirst = resolve })
    const providerOverride = provider(() => first)
    const hook = await renderHook(() => useStarterPackImportController(importRepository(), async () => undefined, providerOverride))
    const running = hook.current.run()
    hook.unmount()
    resolveFirst(candidate(WGER_STARTER_PACK[0]!))
    await expect(running).resolves.toBe(false)
  })

  it('não faz commit nem atualiza estado ao desmontar durante download', async () => {
    const last = WGER_STARTER_PACK.at(-1)!
    let resolveFetch!: (value: unknown) => void
    const pending = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn((url: string) => url === last.imageUrl ? pending : Promise.resolve(imageResponse(url))))
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(imports, async () => undefined, provider()))
    const running = hook.current.run()
    await vi.waitFor(() => expect(hook.current.state).toMatchObject({ status: 'DOWNLOADING_MEDIA', completed: 39 }))
    await act(async () => { hook.unmount() })
    resolveFetch(imageResponse(last.imageUrl!))
    await expect(running).resolves.toBe(false)
    expect(imports.importSelected).not.toHaveBeenCalled()
    expect(fileSystem.files.size).toBe(0)
  })

  it('invalida a confirmação parcial antiga ao desmontar', async () => {
    const imports = importRepository()
    const hook = await renderHook(() => useStarterPackImportController(
      imports, async () => undefined, provider((item, index) => index === 0 ? null : candidate(item)),
    ))
    await act(async () => { await hook.current.run() })
    await act(async () => { hook.unmount() })
    alerts.buttons?.find((button) => button.text === 'Importar disponíveis')?.onPress?.()
    expect(imports.importSelected).not.toHaveBeenCalled()
    expect(fileSystem.files.size).toBe(0)
  })
})

function importRepository() {
  return {
    importSelected: vi.fn(async (items: ExternalExerciseCandidate[]) => ({
      created: items.length, updated: 0, unchanged: 0, skipped: 0, failed: 0, warnings: [], affectedIds: [],
    })),
  } as unknown as ExternalExerciseImportRepository
}

function provider(transform?: (item: typeof WGER_STARTER_PACK[number], index: number) => ExternalExerciseCandidate | null | Promise<ExternalExerciseCandidate>) {
  return {
    findByExternalId: vi.fn(async (id: string) => {
      const index = WGER_STARTER_PACK.findIndex((item) => String(item.providerExerciseId) === id)
      const item = WGER_STARTER_PACK[index]!
      return transform ? transform(item, index) : candidate(item)
    }),
  } as unknown as WgerExerciseCatalogProvider
}

function candidate(item: typeof WGER_STARTER_PACK[number]): ExternalExerciseCandidate {
  const imageUrl = item.imageUrl!
  return {
    provider: 'WGER', externalId: String(item.providerExerciseId), name: item.reviewedPtBrName,
    description: 'Descrição revisada pelo provider.', primaryMuscleGroup: item.expectedPrimaryMuscles[0]!,
    secondaryMuscleGroups: [], equipment: item.expectedEquipment.join(', '), category: item.expectedCategory as never,
    difficulty: 'Não informado', instructions: 'Instruções do provider.', unilateral: false, timed: false,
    sourceUrl: item.sourceUrl, licenseName: item.license, licenseUrl: item.licenseUrl, author: item.attribution,
    media: [{ type: 'IMAGE', source: 'WGER', externalId: `media-${item.providerExerciseId}`, remoteUrl: imageUrl,
      thumbnailRemoteUrl: null, mimeType: mime(imageUrl), width: 100, height: 100, durationSeconds: null,
      main: true, sortOrder: 0, licenseName: item.license, licenseUrl: item.licenseUrl,
      author: item.attribution, sourceUrl: item.sourceUrl }],
    warnings: [], language: 'pt-br', original: {
      translations: [{ language: 2, name: item.originalName }],
      category: { name: item.expectedCategory },
      muscles: item.expectedPrimaryMuscles.map((name) => ({ name_en: name })),
      equipment: item.expectedEquipment.map((name) => ({ name })),
      license: { full_name: item.license, url: item.licenseUrl },
    },
  }
}

function imageResponse(url: string) {
  const bytes = imageBytes(url)
  return { ok: true, status: 200, headers: new Headers({ 'content-type': mime(url) }), arrayBuffer: async () => bytes.buffer }
}

function imageBytes(url: string) {
  if (mime(url) === 'image/jpeg') return new Uint8Array([0xff, 0xd8, 0xff, 0x00])
  if (mime(url) === 'image/webp') return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
}

function mime(url: string) {
  return url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg') ? 'image/jpeg'
    : url.toLowerCase().includes('.webp') ? 'image/webp' : 'image/png'
}

function extension(url: string) {
  return url.match(/\.(png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() ?? 'img'
}

function mediaPath(item: typeof WGER_STARTER_PACK[number]) {
  return `file:///document/training-app/wger-media/wger-${item.providerExerciseId}-media-${item.providerExerciseId}.${extension(item.imageUrl!)}`
}

async function renderHook<T>(callback: () => T) {
  let current!: T
  let renderer!: ReactTestRenderer
  function Harness() {
    current = callback()
    return null
  }
  await act(async () => { renderer = create(createElement(Harness)) })
  return {
    get current() { return current },
    unmount: () => renderer.unmount(),
  }
}

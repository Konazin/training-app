import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type {
  AutomaticBackupInfo,
  BackupRepository,
  DashboardRepository,
  ExerciseLibraryRepository,
  ExternalExerciseCandidate,
  ExternalExerciseImportRepository,
  WorkoutSession,
  WorkoutSessionRepository,
} from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError } from '@training/training-wger'
import type { AppMetadataRepository } from '@training/training-local-db'
import { useTrainingController } from './useTrainingController'
import { useWorkoutSessionController } from './useWorkoutSessionController'
import { useBackupController } from './useBackupController'
import { useWgerIntegrationController } from '../features/wger/useWgerIntegrationController'

const mocks = vi.hoisted(() => ({
  storage: {
    get: vi.fn(async (): Promise<unknown> => null),
    set: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
  automatic: {
    list: vi.fn(async () => []),
    create: vi.fn(async (reason: string) => ({
      uri: 'file:///backup.json', fileName: 'backup.json',
      createdAt: '2026-07-29T12:00:00.000Z', sizeBytes: 10, reason,
    })),
    restore: vi.fn(async () => {}),
    share: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    deleteAll: vi.fn(async () => {}),
  },
}))
const { storage, automatic } = mocks

vi.mock('../integrations/restTimerStorage', () => ({ restTimerStorage: mocks.storage }))
vi.mock('../integrations/automaticBackupService', () => ({
  createAutomaticBackupService: () => mocks.automatic,
}))
vi.mock('../integrations/backupFiles', () => ({
  shareBackup: vi.fn(async () => {}),
  pickBackup: vi.fn(async () => ({ schemaVersion: 1 })),
}))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

describe('controllers locais', () => {
  it('atualiza biblioteca/dashboard, cria e expõe update inválido', async () => {
    const exercise = {
      id: 1, name: 'Flexão', normalizedName: 'flexao',
    } as Awaited<ReturnType<ExerciseLibraryRepository['create']>>
    const exercises = {
      list: vi.fn(async () => [exercise]),
      create: vi.fn(async () => exercise),
      update: vi.fn(async () => { throw new Error('Exercício inválido') }),
    } as unknown as ExerciseLibraryRepository
    const dashboard = {
      get: vi.fn(async () => ({ activePlanName: 'Local' })),
    } as unknown as DashboardRepository
    const hook = await renderController(() => useTrainingController(exercises, dashboard))
    await act(async () => { await hook.current.refresh() })
    expect(hook.current.exerciseLibrary).toEqual([exercise])
    await act(async () => { await hook.current.createExerciseDefinition({} as never) })
    expect(exercises.create).toHaveBeenCalledTimes(1)
    await act(async () => { await hook.current.updateExerciseDefinition(1, {} as never) })
    expect(hook.current.message).toBe('Exercício inválido')
    hook.unmount()
  })

  it('controla sessão, bloqueia edição pausada, recupera e limpa cronômetro', async () => {
    let active: WorkoutSession | null = session('IN_PROGRESS')
    let releaseStart!: () => void
    const repository = {
      getHistory: vi.fn(async () => []),
      getActive: vi.fn(async () => active),
      start: vi.fn(() => new Promise<WorkoutSession>((resolve) => {
        releaseStart = () => resolve(active!)
      })),
      updateSet: vi.fn(async () => {
        if (active?.status === 'PAUSED') throw new Error('Transição inválida')
        return active!
      }),
      pause: vi.fn(async () => active = session('PAUSED')),
      resume: vi.fn(async () => active = session('IN_PROGRESS')),
      complete: vi.fn(async () => active = session('COMPLETED')),
      abandon: vi.fn(async () => active = session('ABANDONED')),
    } as unknown as WorkoutSessionRepository
    const hook = await renderController(() => useWorkoutSessionController(repository))
    await act(async () => { await hook.current.refresh() })
    storage.get.mockResolvedValueOnce({
      sessionId: 1, exerciseId: 2, setId: 3, endsAt: Date.now() + 30_000, paused: false,
    })
    await act(async () => { await hook.current.refresh() })
    expect(hook.current.restTimer?.sessionId).toBe(1)

    let first!: Promise<boolean>
    let second!: Promise<boolean>
    await act(async () => {
      first = hook.current.start(1, 1)
      second = hook.current.start(1, 1)
      releaseStart()
      await Promise.all([first, second])
    })
    expect(repository.start).toHaveBeenCalledTimes(1)
    expect(await second).toBe(false)
    await act(async () => { await hook.current.updateSet(2, 3, {} as never) })
    await act(async () => { await hook.current.pause() })
    expect(hook.current.activeSession?.status).toBe('PAUSED')
    let pausedEdit = true
    await act(async () => {
      pausedEdit = await hook.current.updateSet(2, 3, {} as never)
    })
    expect(pausedEdit).toBe(false)
    await act(async () => { await hook.current.resume() })
    expect(hook.current.activeSession?.status).toBe('IN_PROGRESS')
    act(() => hook.current.startRest(2, 3, 30))
    expect(storage.set).toHaveBeenCalled()
    let firstComplete!: Promise<boolean>
    let secondComplete!: Promise<boolean>
    await act(async () => {
      firstComplete = hook.current.complete(8, 'ok')
      secondComplete = hook.current.complete(8, 'duplicada')
      await Promise.all([firstComplete, secondComplete])
    })
    expect(await firstComplete).toBe(true)
    expect(await secondComplete).toBe(false)
    expect(repository.complete).toHaveBeenCalledTimes(1)
    expect(storage.clear).toHaveBeenCalled()
    expect(hook.current.activeSession).toBeNull()

    active = session('IN_PROGRESS')
    repository.start = vi.fn(async () => active!)
    await act(async () => { await hook.current.start(1, 1) })
    await act(async () => { await hook.current.abandon() })
    expect(repository.abandon).toHaveBeenCalled()
    hook.unmount()
  })

  it('cria backup automático antes de apagar e atualiza após restore', async () => {
    const repository = {
      reset: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    } as unknown as BackupRepository
    const changed = vi.fn(async () => {})
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.2.0',
      vi.fn(async () => {}),
      changed,
    ))
    await act(async () => { await hook.current.eraseAll() })
    expect(automatic.create).toHaveBeenCalledWith('BEFORE_ERASE')
    expect(repository.reset).toHaveBeenCalled()
    await act(async () => { await hook.current.restoreAutomatic('file:///backup.json') })
    expect(automatic.create).toHaveBeenCalledWith('BEFORE_IMPORT')
    expect(automatic.restore).toHaveBeenCalledWith('file:///backup.json')
    expect(changed).toHaveBeenCalledTimes(2)
    hook.unmount()
  })

  it('busca, ignora resposta antiga, seleciona, importa e isola falha offline do Wger', async () => {
    const first = deferred<ReturnType<WgerExerciseCatalogProvider['search']>>()
    const second = deferred<ReturnType<WgerExerciseCatalogProvider['search']>>()
    const candidateA = wgerCandidate('1', 'Antigo')
    const candidateB = wgerCandidate('2', 'Atual')
    const provider = {
      search: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
        .mockRejectedValueOnce(new WgerHttpError('OFFLINE', 'Sem internet')),
      findByExternalId: vi.fn(),
    } as unknown as WgerExerciseCatalogProvider
    const imports = {
      previewExisting: vi.fn(async () => []),
      importSelected: vi.fn(async () => ({
        created: 1, updated: 0, unchanged: 0, skipped: 0, failed: 0,
        warnings: [], affectedIds: [10],
      })),
    } as unknown as ExternalExerciseImportRepository
    const exercises = {
      list: vi.fn(async () => []),
    } as unknown as ExerciseLibraryRepository
    const changed = vi.fn(async () => {})
    const hook = await renderController(() => useWgerIntegrationController(
      imports, exercises, changed, provider,
    ))

    let oldRequest!: Promise<boolean>
    let newRequest!: Promise<boolean>
    await act(async () => {
      oldRequest = hook.current.search(1)
      newRequest = hook.current.search(2)
      second.resolve(page(candidateB, 2))
      await newRequest
      first.resolve(page(candidateA, 1))
      await oldRequest
    })
    expect(hook.current.items.map((item) => item.name)).toEqual(['Atual'])
    act(() => hook.current.toggle(candidateB))
    expect(hook.current.selected.size).toBe(1)
    await act(async () => { await hook.current.importSelected() })
    expect(imports.importSelected).toHaveBeenCalledWith([candidateB])
    expect(hook.current.phase).toBe('success')
    expect(changed).toHaveBeenCalled()

    await act(async () => { await hook.current.search(1) })
    expect(hook.current.phase).toBe('offline')
    expect(hook.current.message).toMatchObject({ kind: 'error', text: 'Sem internet' })
    hook.unmount()
  })
})

async function renderController<T>(useController: () => T) {
  let current!: T
  let renderer!: ReactTestRenderer
  function Harness() {
    current = useController()
    return null
  }
  await act(async () => {
    renderer = create(createElement(Harness))
  })
  return {
    get current() { return current },
    unmount: () => act(() => renderer.unmount()),
  }
}

function session(status: WorkoutSession['status']): WorkoutSession {
  return {
    id: 1, trainingPlanId: 1, planDayId: 1, workoutName: 'Local', dayName: 'Segunda',
    scheduledDate: '2026-07-29', startedAt: '2026-07-29T12:00:00.000Z',
    completedAt: status === 'COMPLETED' || status === 'ABANDONED'
      ? '2026-07-29T12:10:00.000Z'
      : null,
    pausedAt: status === 'PAUSED' ? '2026-07-29T12:05:00.000Z' : null,
    pausedDurationSeconds: 0, status, totalDurationSeconds: 0, overallRpe: null,
    notes: '', completedSets: 0, totalPlannedSets: 0, totalVolume: 0, exercises: [],
  }
}

function wgerCandidate(externalId: string, name: string): ExternalExerciseCandidate {
  return {
    provider: 'WGER', externalId, name, description: '', primaryMuscleGroup: 'Bíceps',
    secondaryMuscleGroups: [], equipment: 'Corpo', category: 'STRENGTH',
    difficulty: 'Não informado', instructions: '', unilateral: false, timed: false,
    sourceUrl: `https://wger.de/en/exercise/${externalId}/view`,
    licenseName: null, licenseUrl: null, author: null, media: [], warnings: [],
    language: 'pt', original: {},
  }
}

function page(item: ExternalExerciseCandidate, pageNumber: number) {
  return {
    items: [item],
    page: pageNumber,
    pageSize: 20,
    total: 2,
    hasNext: pageNumber === 1,
    hasPrevious: pageNumber > 1,
  }
}

function deferred<T extends Promise<unknown>>() {
  let resolve!: (value: Awaited<T>) => void
  const promise = new Promise<Awaited<T>>((done) => { resolve = done })
  return { promise, resolve }
}

import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AutomaticBackupInfo,
  BackupRepository,
  DashboardRepository,
  ExerciseLibraryRepository,
  ExternalExerciseCandidate,
  ExternalExerciseImportRepository,
  TrainingPlan,
  TrainingPlanRepository,
  TrainingPlanTrashRepository,
  WorkoutSession,
  WorkoutSessionRepository,
} from '@training/training-domain'
import { WgerExerciseCatalogProvider, WgerHttpError } from '@training/training-wger'
import type { AppMetadataRepository } from '@training/training-local-db'
import { useTrainingController } from './useTrainingController'
import { useWorkoutSessionController } from './useWorkoutSessionController'
import { useBackupController } from './useBackupController'
import { runRefreshParts } from './refreshAll'
import { useWgerIntegrationController } from '../features/wger/useWgerIntegrationController'
import {
  isEmptyTrashConfirmation,
  useTrainingPlanTrashController,
} from '../features/training-plan/controller/useTrainingPlanTrashController'
import { useTrainingPlanController } from '../features/training-plan/controller/useTrainingPlanController'

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

beforeEach(() => {
  automatic.list.mockReset().mockResolvedValue([])
  automatic.create.mockReset().mockImplementation(async (reason: string) => ({
    uri: 'file:///backup.json',
    fileName: 'backup.json',
    createdAt: '2026-07-29T12:00:00.000Z',
    sizeBytes: 10,
    reason,
  }))
  automatic.restore.mockReset().mockResolvedValue(undefined)
  automatic.share.mockReset().mockResolvedValue(undefined)
  automatic.delete.mockReset().mockResolvedValue(undefined)
  automatic.deleteAll.mockReset().mockResolvedValue(undefined)
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
    const changed = vi.fn(async () => ({ success: true, failedParts: [] }))
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.2.0',
      changed,
    ))
    await act(async () => { await hook.current.eraseAll() })
    expect(automatic.create).toHaveBeenCalledWith('BEFORE_ERASE')
    expect(repository.reset).toHaveBeenCalled()
    expect(hook.current.message).toContain('Backup de segurança criado em')
    await act(async () => { await hook.current.restoreAutomatic('file:///backup.json') })
    expect(automatic.create).toHaveBeenCalledWith('BEFORE_IMPORT')
    expect(automatic.restore).toHaveBeenCalledWith('file:///backup.json')
    expect(changed).toHaveBeenCalledTimes(2)
    hook.unmount()
  })

  it('separa backup confirmado de refresh incompleto e permite repetir só o refresh', async () => {
    automatic.restore.mockClear()
    const repository = {
      reset: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    } as unknown as BackupRepository
    const changed = vi.fn()
      .mockResolvedValueOnce({ success: false, failedParts: ['fichas'] })
      .mockResolvedValueOnce({ success: true, failedParts: [] })
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.4.0',
      changed,
    ))
    await act(async () => {
      expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(true)
    })
    expect(automatic.restore).toHaveBeenCalledTimes(1)
    expect(hook.current.messageKind).toBe('warning')
    expect(hook.current.message).toBe(
      'Backup automático restaurado, mas algumas informações não puderam ser atualizadas. Não atualizadas: fichas.',
    )
    await act(async () => {
      expect(await hook.current.retryRefresh()).toBe(true)
    })
    expect(automatic.restore).toHaveBeenCalledTimes(1)
    expect(changed).toHaveBeenCalledTimes(2)
    hook.unmount()
  })

  it('mantém o lock de backup durante mutation, lista e telas e bloqueia duplo toque', async () => {
    const mutation = deferredValue<void>()
    const backupRefresh = deferredValue<AutomaticBackupInfo[]>()
    const changedRefresh = deferredValue<Awaited<ReturnType<typeof runRefreshParts>>>()
    automatic.list
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => backupRefresh.promise as never)
    automatic.restore.mockReturnValueOnce(mutation.promise)
    const changed = vi.fn(() => changedRefresh.promise)
    const repository = {
      reset: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    } as unknown as BackupRepository
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.5.0',
      changed,
    ))

    let first!: Promise<boolean>
    let second!: Promise<boolean>
    act(() => {
      first = hook.current.restoreAutomatic('file:///backup.json')
      second = hook.current.restoreAutomatic('file:///backup.json')
    })
    await act(async () => { await Promise.resolve() })
    expect(automatic.restore).toHaveBeenCalledTimes(1)
    await expect(second).resolves.toBe(false)
    expect(hook.current.busy).toBe(true)

    await act(async () => {
      mutation.resolve()
      await Promise.resolve()
    })
    expect(hook.current.busy).toBe(true)
    expect(changed).not.toHaveBeenCalled()
    expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(false)

    await act(async () => {
      backupRefresh.resolve([])
      await Promise.resolve()
    })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(hook.current.busy).toBe(true)
    expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(false)

    await act(async () => {
      changedRefresh.resolve({ success: true, failedParts: [] })
      await first
    })
    expect(hook.current.busy).toBe(false)
    hook.unmount()
  })

  it('transforma falhas dos dois refreshes pós-commit em warning e retry não repete restore', async () => {
    automatic.list
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('lista indisponível'))
      .mockResolvedValueOnce([])
    const changed = vi.fn()
      .mockResolvedValueOnce({ success: false, failedParts: ['fichas', 'sessão'] })
      .mockResolvedValueOnce({ success: true, failedParts: [] })
    const repository = {
      reset: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    } as unknown as BackupRepository
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.5.0',
      changed,
    ))

    await act(async () => {
      expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(true)
    })
    expect(hook.current.messageKind).toBe('warning')
    expect(hook.current.refreshPending).toBe(true)
    expect(hook.current.message).toContain('lista de backups, fichas, sessão')
    expect(automatic.restore).toHaveBeenCalledTimes(1)

    await act(async () => {
      expect(await hook.current.retryRefresh()).toBe(true)
    })
    expect(automatic.list).toHaveBeenCalledTimes(3)
    expect(changed).toHaveBeenCalledTimes(2)
    expect(automatic.restore).toHaveBeenCalledTimes(1)
    expect(hook.current.refreshPending).toBe(false)
    hook.unmount()
  })

  it('libera o lock do backup após erro anterior ao commit', async () => {
    automatic.restore
      .mockRejectedValueOnce(new Error('Restore falhou'))
      .mockResolvedValueOnce(undefined)
    const repository = {
      reset: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    } as unknown as BackupRepository
    const changed = vi.fn(async () => ({ success: true, failedParts: [] }))
    const hook = await renderController(() => useBackupController(
      repository,
      {} as AppMetadataRepository,
      '0.5.0',
      changed,
    ))
    await act(async () => {
      expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(false)
    })
    expect(changed).not.toHaveBeenCalled()
    await act(async () => {
      expect(await hook.current.restoreAutomatic('file:///backup.json')).toBe(true)
    })
    expect(automatic.restore).toHaveBeenCalledTimes(2)
    expect(hook.current.busy).toBe(false)
    hook.unmount()
  })

  it('refresh global trata false e rejeição como falhas e coleta todas as partes', async () => {
    await expect(runRefreshParts([
      { name: 'sessão', refresh: vi.fn(async () => true) },
      { name: 'lixeira e badge', refresh: vi.fn(async () => false) },
      { name: 'dashboard', refresh: vi.fn(async () => { throw new Error('offline') }) },
    ])).resolves.toEqual({
      success: false,
      failedParts: ['lixeira e badge', 'dashboard'],
    })
  })

  it('preserva sucesso de criação e duplicação quando refresh posterior retorna false', async () => {
    const created = trashPlan(20, 'PPL')
    const duplicated = trashPlan(21, 'PPL — Cópia')
    const repository = {
      list: vi.fn(async () => []),
      createWithDays: vi.fn(async () => created),
      duplicate: vi.fn(async () => duplicated),
    } as unknown as TrainingPlanRepository
    const refresh = vi.fn(async () => false)
    const hook = await renderController(() => useTrainingPlanController(repository, refresh))
    let createResult!: Awaited<ReturnType<typeof hook.current.createWithDays>>
    await act(async () => {
      createResult = await hook.current.createWithDays({
        plan: {
          name: 'PPL',
          description: '',
          category: 'Hipertrofia',
          difficulty: 'Intermediário',
        },
        days: [],
      })
    })
    expect(createResult).toEqual({
      status: 'success',
      refreshWarning: true,
      plan: created,
    })
    let duplicateResult!: Awaited<ReturnType<typeof hook.current.duplicate>>
    await act(async () => {
      duplicateResult = await hook.current.duplicate(20, 'STRUCTURE_ONLY')
    })
    expect(repository.duplicate).toHaveBeenCalledWith(20, 'STRUCTURE_ONLY')
    expect(duplicateResult).toEqual({
      status: 'success',
      refreshWarning: true,
      plan: duplicated,
    })
    expect(hook.current.selectedTrainingPlanId).toBe(21)
    expect(hook.current.messageKind).toBe('warning')
    hook.unmount()
  })

  it('mantém create e os três modos de duplicate bloqueados até o refresh terminar', async () => {
    const cases = [
      { key: 'create', mode: null },
      { key: 'complete', mode: 'COMPLETE' as const },
      { key: 'structure', mode: 'STRUCTURE_ONLY' as const },
      { key: 'without-loads', mode: 'WITHOUT_LOADS' as const },
    ]
    for (const testCase of cases) {
      const refresh = deferredValue<boolean>()
      const created = trashPlan(30, `Ficha ${testCase.key}`)
      const repository = {
        list: vi.fn(async () => []),
        createWithDays: vi.fn(async () => created),
        duplicate: vi.fn(async () => created),
      } as unknown as TrainingPlanRepository
      const onChanged = vi.fn(() => refresh.promise)
      const hook = await renderController(() => useTrainingPlanController(repository, onChanged))
      const execute = () => testCase.mode
        ? hook.current.duplicate(20, testCase.mode)
        : hook.current.createWithDays({
            plan: {
              name: 'Ficha',
              description: '',
              category: 'Força',
              difficulty: 'Iniciante',
            },
            days: [],
          })

      let first!: ReturnType<typeof execute>
      act(() => { first = execute() })
      await act(async () => { await Promise.resolve() })
      expect(onChanged).toHaveBeenCalledTimes(1)
      await act(async () => {
        expect(await execute()).toEqual({ status: 'failed' })
      })
      const mutation = testCase.mode ? repository.duplicate : repository.createWithDays
      expect(mutation).toHaveBeenCalledTimes(1)

      await act(async () => {
        refresh.resolve(true)
        await first
      })
      await act(async () => { await execute() })
      expect(mutation).toHaveBeenCalledTimes(2)
      hook.unmount()
    }
  })

  it('libera o lock de ficha após falha da mutation e após unmount com refresh pendente', async () => {
    const created = trashPlan(40, 'Ficha')
    const pendingRefresh = deferredValue<boolean>()
    const repository = {
      list: vi.fn(async () => []),
      createWithDays: vi.fn()
        .mockRejectedValueOnce(new Error('Falha de criação'))
        .mockResolvedValue(created),
    } as unknown as TrainingPlanRepository
    const onChanged = vi.fn(() => pendingRefresh.promise)
    const hook = await renderController(() => useTrainingPlanController(repository, onChanged))
    const input = {
      plan: {
        name: 'Ficha',
        description: '',
        category: 'Força',
        difficulty: 'Iniciante',
      },
      days: [],
    }
    await act(async () => {
      expect(await hook.current.createWithDays(input)).toEqual({ status: 'failed' })
    })
    let committed!: ReturnType<typeof hook.current.createWithDays>
    act(() => { committed = hook.current.createWithDays(input) })
    await act(async () => { await Promise.resolve() })
    hook.unmount()
    await act(async () => {
      pendingRefresh.resolve(false)
      await expect(committed).resolves.toMatchObject({
        status: 'success',
        refreshWarning: true,
      })
    })
    expect(repository.createWithDays).toHaveBeenCalledTimes(2)
  })

  it('publica Desfazer somente depois de liberar mutation e refresh', async () => {
    expect(isEmptyTrashConfirmation('esvaziar')).toBe(true)
    expect(isEmptyTrashConfirmation(' esvaziar ')).toBe(true)
    expect(isEmptyTrashConfirmation('esvaziar agora')).toBe(false)
    const mutation = deferredValue<ReturnType<typeof trashPlan>>()
    const refresh = deferredValue<ReturnType<typeof trashPlan>[]>()
    const repository = trashRepository({
      moveToTrash: vi.fn(() => mutation.promise),
      list: vi.fn(() => refresh.promise),
    })
    const hook = await renderTrashController(repository)
    let operation!: ReturnType<typeof hook.current.moveToTrash>
    act(() => { operation = hook.current.moveToTrash(7) })
    await act(async () => { mutation.resolve(trashPlan()) })
    expect(hook.current.busyKey).toBe('trash:move:7')
    expect(hook.current.pendingUndo).toBeNull()
    await act(async () => {
      refresh.resolve([trashPlan()])
      await operation
    })
    expect(hook.current.busyKey).toBeNull()
    expect(hook.current.pendingUndo?.planId).toBe(7)
    expect(hook.current.count).toBe(1)
    hook.unmount()
  })

  it('preserva sucesso e undo quando refresh falha depois do commit', async () => {
    const repository = trashRepository({
      list: vi.fn(async () => { throw new Error('lista indisponível') }),
    })
    const hook = await renderTrashController(repository)
    let result!: Awaited<ReturnType<typeof hook.current.moveToTrash>>
    await act(async () => { result = await hook.current.moveToTrash(7) })
    expect(result).toEqual({ status: 'success', refreshWarning: true })
    expect(hook.current.pendingUndo?.status).toBe('available')
    expect(hook.current.message).toBe(
      'Ficha movida para a lixeira, mas a tela não pôde ser atualizada.',
    )
    hook.unmount()
  })

  it('serializa toque rápido, limpa token só após restore e permite nova tentativa', async () => {
    const restore = deferredValue<ReturnType<typeof trashPlan>>()
    const repository = trashRepository({ restore: vi.fn(() => restore.promise) })
    const hook = await renderTrashController(repository)
    await act(async () => { await hook.current.moveToTrash(7) })
    const token = hook.current.pendingUndo!.token
    let first!: Promise<boolean>
    let second!: Promise<boolean>
    act(() => {
      first = hook.current.undoMoveToTrash(token)
      second = hook.current.undoMoveToTrash(token)
    })
    expect(repository.restore).toHaveBeenCalledTimes(1)
    expect(hook.current.pendingUndo?.status).toBe('running')
    expect(hook.current.message).toBe('Ficha movida para a lixeira.')
    await act(async () => {
      restore.resolve(trashPlan())
      await Promise.all([first, second])
    })
    expect(await first).toBe(true)
    expect(await second).toBe(false)
    expect(hook.current.pendingUndo).toBeNull()
    expect(hook.current.message).toBe('Ficha restaurada.')

    await act(async () => { await hook.current.moveToTrash(7) })
    const retryToken = hook.current.pendingUndo!.token
    repository.restore = vi.fn()
      .mockRejectedValueOnce(new Error('Restore falhou'))
      .mockResolvedValueOnce(trashPlan())
    let failed = true
    await act(async () => { failed = await hook.current.undoMoveToTrash(retryToken) })
    expect(failed).toBe(false)
    expect(hook.current.pendingUndo?.status).toBe('available')
    await act(async () => { await hook.current.undoMoveToTrash(retryToken) })
    expect(repository.restore).toHaveBeenCalledTimes(2)
    hook.unmount()
  })

  it('callback antigo não limpa token novo e expiração decide uma única vez', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T12:00:00.000Z'))
    const restore = deferredValue<ReturnType<typeof trashPlan>>()
    const repository = trashRepository({ restore: vi.fn(() => restore.promise) })
    const hook = await renderTrashController(repository)
    await act(async () => { await hook.current.moveToTrash(7) })
    const tokenA = hook.current.pendingUndo!.token
    const notificationA = hook.current.notificationId
    await act(async () => { await hook.current.moveToTrash(8) })
    const tokenB = hook.current.pendingUndo!.token
    act(() => hook.current.dismissNotification(notificationA, tokenA))
    expect(hook.current.pendingUndo?.token).toBe(tokenB)
    expect(hook.current.message).toBe('Ficha movida para a lixeira.')

    let undo!: Promise<boolean>
    act(() => { undo = hook.current.undoMoveToTrash(tokenB) })
    vi.advanceTimersByTime(7000)
    expect(repository.restore).toHaveBeenCalledTimes(1)
    await act(async () => {
      restore.resolve(trashPlan(8, 'Ficha B'))
      await undo
    })
    expect(hook.current.pendingUndo).toBeNull()

    await act(async () => { await hook.current.moveToTrash(9) })
    const expiredToken = hook.current.pendingUndo!.token
    vi.advanceTimersByTime(7000)
    await act(async () => {
      expect(await hook.current.undoMoveToTrash(expiredToken)).toBe(false)
    })
    expect(repository.restore).toHaveBeenCalledTimes(1)
    hook.unmount()
    vi.useRealTimers()
  })

  it('backup falho impede empty e commit com refresh falho continua sucesso', async () => {
    const repository = trashRepository()
    const backup = safetyBackup()
    const hook = await renderTrashController(repository, backup)
    await act(async () => {
      backup.mockRejectedValueOnce(new Error('Backup falhou'))
      expect(await hook.current.emptyTrash()).toEqual({ status: 'failed' })
    })
    expect(repository.emptyTrash).not.toHaveBeenCalled()
    expect(hook.current.message).toBe('Backup falhou')
    repository.list = vi.fn(async () => { throw new Error('refresh falhou') })
    let result!: Awaited<ReturnType<typeof hook.current.emptyTrash>>
    await act(async () => { result = await hook.current.emptyTrash() })
    expect(backup).toHaveBeenCalledTimes(2)
    expect(repository.emptyTrash).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ status: 'success', refreshWarning: true })
    expect(hook.current.message).toBe('Lixeira esvaziada, mas a tela não pôde ser atualizada.')
    hook.unmount()
  })

  it('não atualiza estado desmontado após refresh pendente', async () => {
    const refresh = deferredValue<ReturnType<typeof trashPlan>[]>()
    const repository = trashRepository({ list: vi.fn(() => refresh.promise) })
    const hook = await renderTrashController(repository)
    const operation = hook.current.moveToTrash(7)
    hook.unmount()
    refresh.resolve([trashPlan()])
    await expect(operation).resolves.toEqual({ status: 'success', refreshWarning: false })
  })

  it('retryRefresh coleta todas as falhas sem repetir mutation', async () => {
    const repository = trashRepository({
      list: vi.fn(async () => { throw new Error('lista') }),
    })
    const refreshPlans = vi.fn(async () => { throw new Error('fichas') })
    const refreshDashboard = vi.fn(async () => false)
    const hook = await renderTrashController(
      repository,
      safetyBackup(),
      refreshPlans,
      refreshDashboard,
    )
    await act(async () => {
      expect(await hook.current.retryRefresh()).toBe(false)
    })
    expect(hook.current.message).toContain('lixeira e badge, fichas, dashboard')
    expect(repository.moveToTrash).not.toHaveBeenCalled()
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

  it('atualiza cada cópia pela fonte correta e mantém a local quando uma fonte falha', async () => {
    const wger = wgerCandidate('123', 'Wger local')
    const exercisedb = { ...wger, provider: 'EXERCISEDB' as const, name: 'ExerciseDB local' }
    const wgerFind = vi.spyOn(WgerExerciseCatalogProvider.prototype, 'findByExternalId')
      .mockResolvedValue(wger)
    const exercisedbProvider = {
      descriptor: { id: 'EXERCISEDB' as const },
      findByExternalId: vi.fn(async () => exercisedb),
      search: vi.fn(),
    } as unknown as import('@training/training-exercisedb').ExerciseDbClient
    const imports = {
      previewExisting: vi.fn(async () => []),
      importSelected: vi.fn(async () => ({
        created: 0, updated: 2, unchanged: 0, skipped: 0, failed: 0,
        warnings: [], affectedIds: [1, 2],
      })),
    } as unknown as ExternalExerciseImportRepository
    const exercises = {
      list: vi.fn(async (query?: { source?: string }) => query?.source === 'WGER' ? [{ id: 1, source: 'WGER', externalId: '123', name: 'Wger local' } as never] : [{ id: 2, source: 'EXERCISEDB', externalId: '123', name: 'ExerciseDB local' } as never]),
    } as unknown as ExerciseLibraryRepository
    const hook = await renderController(() => useWgerIntegrationController(imports, exercises, vi.fn(async () => {}), exercisedbProvider))
    await act(async () => { await hook.current.refreshImported() })
    expect(wgerFind).toHaveBeenCalledWith('123', 'pt-br', expect.any(AbortSignal))
    expect(exercisedbProvider.findByExternalId).toHaveBeenCalledWith('123', 'pt-br', expect.any(AbortSignal))
    expect(imports.importSelected).toHaveBeenCalledWith([wger, exercisedb])
    hook.unmount()
    wgerFind.mockRestore()
  })

  it('mantém a busca disponível quando os idiomas do Wger falham', async () => {
    const languages = vi.spyOn(WgerExerciseCatalogProvider.prototype, 'getLanguages').mockRejectedValue(new Error('idiomas offline'))
    const candidate = wgerCandidate('321', 'Catálogo')
    const provider = {
      descriptor: { id: 'EXERCISEDB' as const },
      search: vi.fn(async () => page(candidate, 1)),
      findByExternalId: vi.fn(),
    } as unknown as import('@training/training-exercisedb').ExerciseDbClient
    const imports = {
      previewExisting: vi.fn(async () => []),
      importSelected: vi.fn(),
    } as unknown as ExternalExerciseImportRepository
    const exercises = { list: vi.fn(async () => []) } as unknown as ExerciseLibraryRepository
    const hook = await renderController(() => useWgerIntegrationController(imports, exercises, vi.fn(async () => {}), provider))
    await act(async () => {
      expect(await hook.current.loadLanguages()).toEqual([])
      expect(await hook.current.search()).toBe(true)
    })
    expect(hook.current.items).toEqual([candidate])
    hook.unmount()
    languages.mockRestore()
  })

  it('mantém seleção e importação ao trocar de página', async () => {
    const first = wgerCandidate('1', 'Primeiro')
    const second = wgerCandidate('2', 'Segundo')
    const provider = {
      descriptor: { id: 'EXERCISEDB' as const },
      search: vi.fn().mockResolvedValueOnce(page(first, 1)).mockResolvedValueOnce(page(second, 2)),
      findByExternalId: vi.fn(),
    } as unknown as import('@training/training-exercisedb').ExerciseDbClient
    const imports = {
      previewExisting: vi.fn(async () => []),
      importSelected: vi.fn(async () => ({ created: 2, updated: 0, unchanged: 0, skipped: 0, failed: 0, warnings: [], affectedIds: [1, 2] })),
    } as unknown as ExternalExerciseImportRepository
    const exercises = { list: vi.fn(async () => []) } as unknown as ExerciseLibraryRepository
    const hook = await renderController(() => useWgerIntegrationController(imports, exercises, vi.fn(async () => {}), provider))
    await act(async () => { await hook.current.search(1) })
    act(() => hook.current.toggle(first))
    await act(async () => { await hook.current.search(2) })
    act(() => hook.current.toggle(second))
    expect(hook.current.selected.size).toBe(2)
    await act(async () => { await hook.current.importSelected() })
    expect(imports.importSelected).toHaveBeenCalledWith([first, second])
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

function renderTrashController(
  repository: TrainingPlanTrashRepository,
  backup = safetyBackup(),
  refreshPlans = vi.fn(async () => true),
  refreshDashboard = vi.fn(async () => true),
) {
  return renderController(() => useTrainingPlanTrashController(
    repository,
    backup,
    refreshPlans,
    refreshDashboard,
  ))
}

function trashRepository(
  overrides: Partial<TrainingPlanTrashRepository> = {},
): TrainingPlanTrashRepository {
  return {
    list: vi.fn(async () => [trashPlan()]),
    count: vi.fn(async () => 1),
    moveToTrash: vi.fn(async (id) => trashPlan(id)),
    restore: vi.fn(async (id) => trashPlan(id)),
    deletePermanently: vi.fn(async () => {}),
    emptyTrash: vi.fn(async () => 1),
    purgeExpired: vi.fn(async () => 0),
    ...overrides,
  }
}

function trashPlan(id = 7, name = 'Ficha'): TrainingPlan {
  return {
    id,
    name,
    description: '',
    category: 'Calistenia',
    difficulty: 'Iniciante',
    startDate: null,
    endDate: null,
    active: false,
    archived: false,
    deletedAt: '2026-07-30T12:00:00.000Z',
    purgeAt: '2026-08-06T12:00:00.000Z',
    days: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  }
}

function safetyBackup() {
  return vi.fn(async (): Promise<AutomaticBackupInfo> => ({
    uri: 'file:///backup.json',
    fileName: 'backup.json',
    createdAt: '2026-07-30T12:00:00.000Z',
    sizeBytes: 10,
    reason: 'BEFORE_EMPTY_TRASH',
  }))
}

function deferredValue<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
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

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AutomaticBackupInfo,
  TrainingPlan,
  TrainingPlanTrashRepository,
} from '@training/training-domain'

const UNDO_DURATION_MS = 6000

export type TrashUiResult =
  | { status: 'success'; refreshWarning: boolean }
  | { status: 'failed' }

type CommittedMutationResult<T> =
  | { status: 'committed'; value: T; refreshStatus: 'success' }
  | { status: 'committed'; value: T; refreshStatus: 'failed'; refreshError: unknown }
  | { status: 'failed'; error: unknown }

export interface PendingTrashUndo {
  token: string
  planId: number
  planName: string
  createdAt: number
  expiresAt: number
  status: 'available' | 'running'
}

export const isEmptyTrashConfirmation = (value: string) =>
  value.trim().toUpperCase() === 'ESVAZIAR'

export function useTrainingPlanTrashController(
  repository: TrainingPlanTrashRepository,
  createSafetyBackup: () => Promise<AutomaticBackupInfo>,
  refreshTrainingPlans: () => Promise<unknown>,
  refreshDashboard: () => Promise<unknown>,
) {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'warning' | 'error'>('success')
  const [notificationId, setNotificationId] = useState(0)
  const [pendingUndo, setPendingUndoState] = useState<PendingTrashUndo | null>(null)
  const activeOperationRef = useRef<string | null>(null)
  const pendingUndoRef = useRef<PendingTrashUndo | null>(null)
  const notificationIdRef = useRef(0)
  const tokenCounterRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const publish = useCallback((
    text: string,
    kind: 'success' | 'warning' | 'error',
  ) => {
    notificationIdRef.current += 1
    if (!mountedRef.current) return
    setMessage(text)
    setMessageKind(kind)
    setNotificationId(notificationIdRef.current)
  }, [])

  const setPendingUndo = useCallback((value: PendingTrashUndo | null) => {
    pendingUndoRef.current = value
    if (mountedRef.current) setPendingUndoState(value)
  }, [])

  const clearPendingUndo = useCallback((token: string) => {
    if (pendingUndoRef.current?.token === token) setPendingUndo(null)
  }, [setPendingUndo])

  const dismissNotification = useCallback((id: number, undoToken?: string) => {
    if (notificationIdRef.current !== id) return
    if (undoToken) clearPendingUndo(undoToken)
    if (mountedRef.current) setMessage('')
  }, [clearPendingUndo])

  const acquireOperation = useCallback((key: string) => {
    if (activeOperationRef.current !== null) return false
    activeOperationRef.current = key
    if (mountedRef.current) {
      setBusyKey(key)
      setMessage('')
    }
    return true
  }, [])

  const releaseOperation = useCallback((key: string) => {
    if (activeOperationRef.current !== key) return
    activeOperationRef.current = null
    if (mountedRef.current) setBusyKey(null)
  }, [])

  const loadTrashData = useCallback(async () => {
    const [items, total] = await Promise.all([repository.list(), repository.count()])
    if (!mountedRef.current) return
    setPlans(items)
    setCount(total)
  }, [repository])

  const refreshTrashDependents = useCallback(async () => {
    const tasks = [
      { name: 'lixeira e badge', promise: loadTrashData() },
      {
        name: 'fichas',
        promise: Promise.resolve().then(refreshTrainingPlans)
          .then((result) => { if (result === false) throw new Error('refresh failed') }),
      },
      {
        name: 'dashboard',
        promise: Promise.resolve().then(refreshDashboard)
          .then((result) => { if (result === false) throw new Error('refresh failed') }),
      },
    ]
    const results = await Promise.allSettled(tasks.map((task) => task.promise))
    const failed = results.flatMap((result, index) =>
      result.status === 'rejected' ? [tasks[index]!.name] : [])
    if (failed.length) throw new Error(`Não foi possível atualizar: ${failed.join(', ')}.`)
  }, [loadTrashData, refreshDashboard, refreshTrainingPlans])

  const executeCommittedMutation = useCallback(async <T,>(
    operationKey: string,
    mutation: () => Promise<T>,
    refreshAfterCommit: () => Promise<void>,
  ): Promise<CommittedMutationResult<T>> => {
    if (!acquireOperation(operationKey)) {
      return { status: 'failed', error: new Error('Outra operação da lixeira está em andamento.') }
    }
    try {
      let value: T
      try {
        value = await mutation()
      } catch (error) {
        return { status: 'failed', error }
      }
      try {
        await refreshAfterCommit()
        return { status: 'committed', value, refreshStatus: 'success' }
      } catch (refreshError) {
        return { status: 'committed', value, refreshStatus: 'failed', refreshError }
      }
    } finally {
      releaseOperation(operationKey)
    }
  }, [acquireOperation, releaseOperation])

  const retryRefresh = useCallback(async () => {
    const key = 'trash:refresh'
    if (!acquireOperation(key)) return false
    if (mountedRef.current) setLoading(true)
    try {
      await refreshTrashDependents()
      return true
    } catch (cause) {
      publish(messageFrom(cause), 'error')
      return false
    } finally {
      if (mountedRef.current) setLoading(false)
      releaseOperation(key)
    }
  }, [acquireOperation, publish, refreshTrashDependents, releaseOperation])

  const purgeExpired = useCallback(async (): Promise<TrashUiResult> => {
    if (mountedRef.current) setLoading(true)
    const result = await executeCommittedMutation(
      'trash:purge',
      () => repository.purgeExpired(),
      refreshTrashDependents,
    )
    if (mountedRef.current) setLoading(false)
    if (result.status === 'failed') {
      publish(messageFrom(result.error), 'error')
      return { status: 'failed' }
    }
    if (result.refreshStatus === 'failed') {
      publish('A limpeza foi concluída, mas a tela não pôde ser atualizada.', 'warning')
      return { status: 'success', refreshWarning: true }
    }
    return { status: 'success', refreshWarning: false }
  }, [executeCommittedMutation, publish, refreshTrashDependents, repository])

  const refresh = useCallback(async () => {
    const result = await purgeExpired()
    return result.status === 'success' && !result.refreshWarning
  }, [purgeExpired])

  const moveToTrash = useCallback(async (planId: number): Promise<TrashUiResult> => {
    const result = await executeCommittedMutation(
      `trash:move:${planId}`,
      () => repository.moveToTrash(planId),
      refreshTrashDependents,
    )
    if (result.status === 'failed') {
      publish(messageFrom(result.error), 'error')
      return { status: 'failed' }
    }
    const createdAt = Date.now()
    tokenCounterRef.current += 1
    setPendingUndo({
      token: `${createdAt}:${tokenCounterRef.current}`,
      planId,
      planName: result.value.name,
      createdAt,
      expiresAt: createdAt + UNDO_DURATION_MS,
      status: 'available',
    })
    const refreshWarning = result.refreshStatus === 'failed'
    publish(
      refreshWarning
        ? 'Ficha movida para a lixeira, mas a tela não pôde ser atualizada.'
        : 'Ficha movida para a lixeira.',
      refreshWarning ? 'warning' : 'success',
    )
    return { status: 'success', refreshWarning }
  }, [executeCommittedMutation, publish, refreshTrashDependents, repository, setPendingUndo])

  const undoMoveToTrash = useCallback(async (token: string) => {
    const pending = pendingUndoRef.current
    if (!pending || pending.token !== token || pending.status === 'running') return false
    if (Date.now() >= pending.expiresAt) {
      clearPendingUndo(token)
      return false
    }
    const result = await executeCommittedMutation(
      `trash:undo:${pending.planId}`,
      async () => {
        const current = pendingUndoRef.current
        if (!current || current.token !== token || current.status !== 'available') {
          throw new Error('Esta ação de desfazer não está mais disponível.')
        }
        setPendingUndo({ ...current, status: 'running' })
        return repository.restore(current.planId)
      },
      refreshTrashDependents,
    )
    if (result.status === 'failed') {
      const current = pendingUndoRef.current
      if (current?.token === token && current.status === 'running') {
        if (Date.now() < current.expiresAt) setPendingUndo({ ...current, status: 'available' })
        else clearPendingUndo(token)
      }
      publish(messageFrom(result.error), 'error')
      return false
    }
    clearPendingUndo(token)
    publish(
      result.refreshStatus === 'failed'
        ? 'Ficha restaurada, mas a tela não pôde ser atualizada.'
        : 'Ficha restaurada.',
      result.refreshStatus === 'failed' ? 'warning' : 'success',
    )
    return true
  }, [
    clearPendingUndo,
    executeCommittedMutation,
    publish,
    refreshTrashDependents,
    repository,
    setPendingUndo,
  ])

  const restore = useCallback(async (planId: number): Promise<TrashUiResult> => {
    const result = await executeCommittedMutation(
      `trash:restore:${planId}`,
      () => repository.restore(planId),
      refreshTrashDependents,
    )
    if (result.status === 'failed') {
      publish(messageFrom(result.error), 'error')
      return { status: 'failed' }
    }
    if (pendingUndoRef.current?.planId === planId) clearPendingUndo(pendingUndoRef.current.token)
    const refreshWarning = result.refreshStatus === 'failed'
    publish(
      refreshWarning ? 'Ficha restaurada, mas a tela não pôde ser atualizada.' : 'Ficha restaurada.',
      refreshWarning ? 'warning' : 'success',
    )
    return { status: 'success', refreshWarning }
  }, [clearPendingUndo, executeCommittedMutation, publish, refreshTrashDependents, repository])

  const deletePermanently = useCallback(async (planId: number): Promise<TrashUiResult> => {
    const result = await executeCommittedMutation(
      `trash:delete:${planId}`,
      () => repository.deletePermanently(planId),
      refreshTrashDependents,
    )
    if (result.status === 'failed') {
      publish(messageFrom(result.error), 'error')
      return { status: 'failed' }
    }
    if (pendingUndoRef.current?.planId === planId) clearPendingUndo(pendingUndoRef.current.token)
    const refreshWarning = result.refreshStatus === 'failed'
    publish(
      refreshWarning
        ? 'Ficha excluída permanentemente, mas a tela não pôde ser atualizada.'
        : 'Ficha excluída permanentemente.',
      refreshWarning ? 'warning' : 'success',
    )
    return { status: 'success', refreshWarning }
  }, [clearPendingUndo, executeCommittedMutation, publish, refreshTrashDependents, repository])

  const emptyTrash = useCallback(async (): Promise<TrashUiResult> => {
    const result = await executeCommittedMutation(
      'trash:empty',
      async () => {
        await createSafetyBackup()
        return repository.emptyTrash()
      },
      refreshTrashDependents,
    )
    if (result.status === 'failed') {
      publish(messageFrom(result.error), 'error')
      return { status: 'failed' }
    }
    const refreshWarning = result.refreshStatus === 'failed'
    publish(
      refreshWarning
        ? 'Lixeira esvaziada, mas a tela não pôde ser atualizada.'
        : 'Backup criado e lixeira esvaziada.',
      refreshWarning ? 'warning' : 'success',
    )
    return { status: 'success', refreshWarning }
  }, [createSafetyBackup, executeCommittedMutation, publish, refreshTrashDependents, repository])

  return {
    plans,
    count,
    loading,
    busy: busyKey !== null,
    busyKey,
    message,
    messageKind,
    notificationId,
    pendingUndo,
    refresh,
    retryRefresh,
    purgeExpired,
    moveToTrash,
    undoMoveToTrash,
    clearPendingUndo,
    dismissNotification,
    restore,
    deletePermanently,
    emptyTrash,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Falha na operação da lixeira.'
}

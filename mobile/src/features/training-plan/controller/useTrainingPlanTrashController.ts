import { useCallback, useRef, useState } from 'react'
import type {
  AutomaticBackupInfo,
  TrainingPlan,
  TrainingPlanTrashRepository,
} from '@training/training-domain'

export const isEmptyTrashConfirmation = (value: string) =>
  value.trim().toUpperCase() === 'ESVAZIAR'

export function useTrainingPlanTrashController(
  repository: TrainingPlanTrashRepository,
  createSafetyBackup: () => Promise<AutomaticBackupInfo>,
  onChanged: () => Promise<unknown>,
) {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success')
  const [notificationId, setNotificationId] = useState(0)
  const undoPlanId = useRef<number | null>(null)
  const running = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await repository.purgeExpired()
      const [items, total] = await Promise.all([repository.list(), repository.count()])
      setPlans(items)
      setCount(total)
      return true
    } catch (cause) {
      setMessageKind('error')
      setMessage(messageFrom(cause))
      setNotificationId((current) => current + 1)
      return false
    } finally {
      setLoading(false)
    }
  }, [repository])

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (running.current) return false
    running.current = true
    undoPlanId.current = null
    setBusy(true)
    setMessage('')
    try {
      await operation()
      await Promise.all([refresh(), onChanged()])
      return true
    } catch (cause) {
      setMessageKind('error')
      setMessage(messageFrom(cause))
      setNotificationId((current) => current + 1)
      return false
    } finally {
      running.current = false
      setBusy(false)
    }
  }, [onChanged, refresh])

  const dismissMessage = useCallback(() => {
    undoPlanId.current = null
    setMessage('')
  }, [])

  const moveToTrash = useCallback((planId: number) => run(async () => {
    await repository.moveToTrash(planId)
    undoPlanId.current = planId
    setMessageKind('success')
    setMessage('Ficha movida para a lixeira.')
    setNotificationId((current) => current + 1)
  }), [repository, run])

  const undo = useCallback(async () => {
    const planId = undoPlanId.current
    if (planId === null) return
    undoPlanId.current = null
    await run(async () => {
      await repository.restore(planId)
      setMessageKind('success')
      setMessage('Ficha restaurada.')
      setNotificationId((current) => current + 1)
    })
  }, [repository, run])

  return {
    plans,
    count,
    loading,
    busy,
    message,
    messageKind,
    notificationId,
    hasUndo: undoPlanId.current !== null,
    refresh,
    moveToTrash,
    undo,
    dismissMessage,
    restore: (planId: number) => run(async () => {
      await repository.restore(planId)
      setMessageKind('success')
      setMessage('Ficha restaurada.')
      setNotificationId((current) => current + 1)
    }),
    deletePermanently: (planId: number) => run(async () => {
      await repository.deletePermanently(planId)
      setMessageKind('success')
      setMessage('Ficha excluída permanentemente.')
      setNotificationId((current) => current + 1)
    }),
    emptyTrash: () => run(async () => {
      await createSafetyBackup()
      await repository.emptyTrash()
      setMessageKind('success')
      setMessage('Lixeira esvaziada.')
      setNotificationId((current) => current + 1)
    }),
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Falha na operação da lixeira.'
}

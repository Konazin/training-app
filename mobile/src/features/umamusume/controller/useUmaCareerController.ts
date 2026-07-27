import { useCallback, useRef, useState } from 'react'
import type { WorkoutSession } from '../../workout-session/model/workoutSession'
import type { CreateUmaCareerInput, UmaCareer, UmaTurn } from '../model/umaCareer'
import type { UmaCareerRepository } from '../repository/UmaCareerRepository'
import { httpUmaCareerRepository } from '../service/httpUmaCareerRepository'

export function useUmaCareerController(
  repository: UmaCareerRepository = httpUmaCareerRepository,
) {
  const [careers, setCareers] = useState<UmaCareer[]>([])
  const [career, setCareer] = useState<UmaCareer | null>(null)
  const [turns, setTurns] = useState<UmaTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const busyRef = useRef('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [all, active] = await Promise.all([repository.list(), repository.active()])
      setCareers(all)
      setCareer(active ?? all[0] ?? null)
    } catch (cause) {
      setMessage(messageFrom(cause))
    } finally {
      setLoading(false)
    }
  }, [repository])

  const update = useCallback(async (
    key: string,
    operation: () => Promise<UmaCareer>,
  ) => {
    if (busyRef.current) return false
    busyRef.current = key
    setBusyKey(key)
    setMessage('')
    try {
      const next = await operation()
      setCareer(next)
      setCareers((current) => [next, ...current.filter((item) => item.id !== next.id)])
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      busyRef.current = ''
      setBusyKey('')
    }
  }, [])

  const createCareer = useCallback(
    (input: CreateUmaCareerInput) => update('create', () => repository.create(input)),
    [repository, update],
  )

  const startTraining = useCallback(async (): Promise<WorkoutSession | null> => {
    if (!career || busyRef.current) return null
    busyRef.current = 'training'
    setBusyKey('training')
    setMessage('')
    try {
      const result = await repository.startTraining(career.id)
      setCareer(result.career)
      return result.session
    } catch (cause) {
      setMessage(messageFrom(cause))
      return null
    } finally {
      busyRef.current = ''
      setBusyKey('')
    }
  }, [career, repository])

  const acceptRestActivity = useCallback(
    (activityId: number) => career
      ? update('rest', () => repository.acceptRestActivity(career.id, activityId))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const completeRestActivity = useCallback(
    (activityId: number) => career
      ? update('rest', () => repository.completeRestActivity(career.id, activityId))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const fullRest = useCallback(
    () => career
      ? update('rest', () => repository.fullRest(career.id))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const abandonCareer = useCallback(
    () => career
      ? update('abandon', () => repository.abandon(career.id))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const refreshTurns = useCallback(async (careerId: number) => {
    try {
      setTurns(await repository.turns(careerId))
    } catch (cause) {
      setMessage(messageFrom(cause))
    }
  }, [repository])

  return {
    careers,
    career,
    turns,
    loading,
    message,
    busyKey,
    refresh,
    createCareer,
    startTraining,
    acceptRestActivity,
    completeRestActivity,
    fullRest,
    abandonCareer,
    refreshTurns,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

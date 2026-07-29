import { useCallback, useRef, useState } from 'react'
import type { WorkoutSession } from '@training/training-contracts'
import {
  selectInitialCareerId,
  type CreateUmaCareerInput,
  type UmaCareer,
  type UmaTurn,
} from '../model/umaCareer'
import type { UmaCareerRepository } from '../repository/UmaCareerRepository'

export function useUmaCareerController(repository: UmaCareerRepository) {
  const [careers, setCareers] = useState<UmaCareer[]>([])
  const [selectedCareerId, setSelectedCareerId] = useState<number | null>(null)
  const [turns, setTurns] = useState<UmaTurn[]>([])
  const [turnsCareerId, setTurnsCareerId] = useState<number | null>(null)
  const [turnsLoading, setTurnsLoading] = useState(false)
  const [turnsError, setTurnsError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const busyRef = useRef(new Set<string>())
  const turnsRequest = useRef(0)

  const career = careers.find((item) => item.id === selectedCareerId) ?? null
  const activeCareer = careers.find((item) => item.status === 'ACTIVE') ?? null

  const begin = useCallback((key: string) => {
    if (busyRef.current.has(key)) return false
    busyRef.current.add(key)
    setBusyKeys(new Set(busyRef.current))
    return true
  }, [])

  const end = useCallback((key: string) => {
    busyRef.current.delete(key)
    setBusyKeys(new Set(busyRef.current))
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const all = await repository.list()
      setCareers(all)
      setSelectedCareerId((current) => selectInitialCareerId(all, current))
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
    if (!begin(key)) return false
    setMessage('')
    try {
      const next = await operation()
      setCareers((current) => [next, ...current.filter((item) => item.id !== next.id)])
      setSelectedCareerId(next.id)
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      end(key)
    }
  }, [begin, end])

  const createCareer = useCallback(
    (input: CreateUmaCareerInput) =>
      update('career:create', () => repository.create(input)),
    [repository, update],
  )

  const startTraining = useCallback(async (): Promise<WorkoutSession | null> => {
    const key = 'training:start'
    if (!career || !begin(key)) return null
    setMessage('')
    try {
      const result = await repository.startTraining(career.id)
      setCareers((current) => [
        result.career,
        ...current.filter((item) => item.id !== result.career.id),
      ])
      return result.session
    } catch (cause) {
      setMessage(messageFrom(cause))
      return null
    } finally {
      end(key)
    }
  }, [begin, career, end, repository])

  const acceptRestActivity = useCallback(
    (activityId: number) => career
      ? update(
          `rest:accept:${activityId}`,
          () => repository.acceptRestActivity(career.id, activityId),
        )
      : Promise.resolve(false),
    [career, repository, update],
  )

  const completeRestActivity = useCallback(
    (activityId: number) => career
      ? update(
          `rest:complete:${activityId}`,
          () => repository.completeRestActivity(career.id, activityId),
        )
      : Promise.resolve(false),
    [career, repository, update],
  )

  const cancelRestActivity = useCallback(
    () => career
      ? update('rest:cancel', () => repository.cancelRestActivity(career.id))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const fullRest = useCallback(
    () => career
      ? update('rest:full', () => repository.fullRest(career.id))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const abandonCareer = useCallback(
    () => career
      ? update('career:abandon', () => repository.abandon(career.id))
      : Promise.resolve(false),
    [career, repository, update],
  )

  const loadTurns = useCallback(async (careerId: number) => {
    const key = `turns:load:${careerId}`
    if (!begin(key)) return
    const request = ++turnsRequest.current
    setTurns([])
    setTurnsCareerId(careerId)
    setTurnsLoading(true)
    setTurnsError('')
    try {
      const result = await repository.turns(careerId)
      if (request === turnsRequest.current) setTurns(result)
    } catch (cause) {
      if (request === turnsRequest.current) setTurnsError(messageFrom(cause))
    } finally {
      if (request === turnsRequest.current) setTurnsLoading(false)
      end(key)
    }
  }, [begin, end, repository])

  return {
    careers,
    career,
    activeCareer,
    selectedCareerId,
    turns,
    turnsCareerId,
    turnsLoading,
    turnsError,
    loading,
    message,
    busyKeys,
    refresh,
    selectCareer: setSelectedCareerId,
    createCareer,
    startTraining,
    acceptRestActivity,
    completeRestActivity,
    cancelRestActivity,
    fullRest,
    abandonCareer,
    loadTurns,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

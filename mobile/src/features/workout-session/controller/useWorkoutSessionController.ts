import { useCallback, useRef, useState } from 'react'
import { workoutSessionStorage } from '../../../core/storage/workoutSessionStorage'
import type {
  RestTimerState,
  SessionExerciseStatus,
  SetLogInput,
  WorkoutSession,
} from '../model/workoutSession'
import type { WorkoutSessionRepository } from '../repository/WorkoutSessionRepository'
import { httpWorkoutSessionRepository } from '../service/httpWorkoutSessionRepository'

export function useWorkoutSessionController(
  repository: WorkoutSessionRepository = httpWorkoutSessionRepository,
) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const busyRef = useRef(new Set<string>())

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [history, active, storedTimer] = await Promise.all([
        repository.getHistory(),
        repository.getActive(),
        workoutSessionStorage.getRestTimer(),
      ])
      setSessions(history)
      setActiveSession(active)
      const timerIsValid = storedTimer && (
        storedTimer.paused
          ? storedTimer.endsAt > (storedTimer.pausedAt ?? 0)
          : storedTimer.endsAt > Date.now()
      )
      if (active && storedTimer?.sessionId === active.id && timerIsValid) {
        setRestTimer(storedTimer)
      } else {
        setRestTimer(null)
        await workoutSessionStorage.clearRestTimer()
      }
    } catch (cause) {
      setMessage(messageFrom(cause))
    } finally {
      setLoading(false)
    }
  }, [repository])

  const mutate = useCallback(async (
    key: string,
    operation: () => Promise<WorkoutSession>,
  ) => {
    if (busyRef.current.has(key)) return false
    busyRef.current.add(key)
    setBusyKeys(new Set(busyRef.current))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    try {
      setActiveSession(await operation())
      return true
    } catch (cause) {
      setErrors((current) => ({ ...current, [key]: messageFrom(cause) }))
      return false
    } finally {
      busyRef.current.delete(key)
      setBusyKeys(new Set(busyRef.current))
    }
  }, [])

  const start = useCallback(async (trainingPlanId: number, planDayId: number) => {
    if (busyRef.current.has('start')) return false
    busyRef.current.add('start')
    setBusyKeys(new Set(busyRef.current))
    setMessage('')
    try {
      const session = await repository.start(trainingPlanId, planDayId)
      setActiveSession(session)
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
      return true
    } catch (cause) {
      setMessage(messageFrom(cause))
      return false
    } finally {
      busyRef.current.delete('start')
      setBusyKeys(new Set(busyRef.current))
    }
  }, [repository])

  const updateSet = useCallback((
    exerciseId: number,
    setId: number,
    input: SetLogInput,
  ) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `set:${setId}`,
      () => repository.updateSet(activeSession.id, exerciseId, setId, input),
    )
  }, [activeSession, mutate, repository])

  const addSet = useCallback((exerciseId: number) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `exercise:${exerciseId}`,
      () => repository.addSet(activeSession.id, exerciseId),
    )
  }, [activeSession, mutate, repository])

  const removeSet = useCallback((exerciseId: number, setId: number) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `set:${setId}`,
      () => repository.removeSet(activeSession.id, exerciseId, setId),
    )
  }, [activeSession, mutate, repository])

  const setExerciseStatus = useCallback((exerciseId: number, status: SessionExerciseStatus) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `exercise:${exerciseId}`,
      () => repository.setExerciseStatus(activeSession.id, exerciseId, status),
    )
  }, [activeSession, mutate, repository])

  const pause = useCallback(async () => {
    if (!activeSession) return Promise.resolve(false)
    const success = await mutate('session', () => repository.pause(activeSession.id))
    if (success) {
      setRestTimer((current) => {
        if (!current || current.paused) return current
        const next = { ...current, paused: true, pausedAt: Date.now() }
        void workoutSessionStorage.setRestTimer(next)
        return next
      })
    }
    return success
  }, [activeSession, mutate, repository])

  const resume = useCallback(async () => {
    if (!activeSession) return Promise.resolve(false)
    const success = await mutate('session', () => repository.resume(activeSession.id))
    if (success) {
      setRestTimer((current) => {
        if (!current?.paused) return current
        const pausedFor = Date.now() - (current.pausedAt ?? Date.now())
        const next = { ...current, endsAt: current.endsAt + pausedFor, paused: false }
        delete next.pausedAt
        void workoutSessionStorage.setRestTimer(next)
        return next
      })
    }
    return success
  }, [activeSession, mutate, repository])

  const finish = useCallback(async (
    operation: (sessionId: number) => Promise<WorkoutSession>,
  ) => {
    if (!activeSession || busyRef.current.has('session')) return false
    busyRef.current.add('session')
    setBusyKeys(new Set(busyRef.current))
    setErrors((current) => ({ ...current, session: '' }))
    try {
      const finished = await operation(activeSession.id)
      setSessions((current) => [finished, ...current.filter((item) => item.id !== finished.id)])
      setActiveSession(null)
      setRestTimer(null)
      await workoutSessionStorage.clearRestTimer()
      return true
    } catch (cause) {
      setErrors((current) => ({ ...current, session: messageFrom(cause) }))
      return false
    } finally {
      busyRef.current.delete('session')
      setBusyKeys(new Set(busyRef.current))
    }
  }, [activeSession])

  const complete = useCallback(
    (overallRpe: number | null, notes: string) =>
      finish((sessionId) => repository.complete(sessionId, overallRpe, notes)),
    [finish, repository],
  )

  const abandon = useCallback(
    () => finish((sessionId) => repository.abandon(sessionId)),
    [finish, repository],
  )

  const startRest = useCallback((
    exerciseId: number,
    setId: number,
    seconds: number,
  ) => {
    if (!activeSession || seconds <= 0) return
    const timer: RestTimerState = {
      sessionId: activeSession.id,
      exerciseId,
      setId,
      endsAt: Date.now() + seconds * 1000,
      paused: false,
    }
    setRestTimer(timer)
    void workoutSessionStorage.setRestTimer(timer)
  }, [activeSession])

  const adjustRest = useCallback((seconds: number) => {
    setRestTimer((current) => {
      if (!current) return null
      const next = { ...current, endsAt: Math.max(Date.now(), current.endsAt + seconds * 1000) }
      void workoutSessionStorage.setRestTimer(next)
      return next
    })
  }, [])

  const skipRest = useCallback(() => {
    setRestTimer(null)
    void workoutSessionStorage.clearRestTimer()
  }, [])

  return {
    sessions,
    activeSession,
    restTimer,
    loading,
    message,
    errors,
    busyKeys,
    refresh,
    start,
    updateSet,
    addSet,
    removeSet,
    setExerciseStatus,
    pause,
    resume,
    complete,
    abandon,
    startRest,
    adjustRest,
    skipRest,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

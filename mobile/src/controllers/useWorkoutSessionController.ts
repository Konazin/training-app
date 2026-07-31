import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  LocalProgressionSuggestion,
  SessionExerciseStatus,
  SetLogInput,
  WorkoutSession,
  WorkoutSessionRepository,
} from '@training/training-domain'
import {
  adjustRestTimer,
  resumeRestTimer,
  type RestTimerState,
} from '../features/workout-session/model/restTimer'
import { restTimerStorage } from '../integrations/restTimerStorage'

export function useWorkoutSessionController(
  repository: WorkoutSessionRepository,
  onChanged?: () => Promise<unknown>,
) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const busy = useRef(new Set<string>())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const [history, active] = await Promise.all([repository.getHistory(), repository.getActive()])
      if (!mounted.current) return false
      setSessions(history)
      setActiveSession(active)
      const timer = active ? await restTimerStorage.get(active.id) : null
      const valid = timer && (timer.paused || timer.endsAt > Date.now())
      if (mounted.current) setRestTimer(valid ? timer : null)
      if (!valid) await restTimerStorage.clear()
      return true
    } catch (cause) {
      if (mounted.current) setMessage(messageFrom(cause))
      return false
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [repository])

  const mutate = useCallback(async (key: string, operation: () => Promise<WorkoutSession>) => {
    if (busy.current.size > 0) return false
    busy.current.add(key)
    setBusyKeys(new Set(busy.current))
    setErrors((current) => ({ ...current, [key]: '' }))
    try {
      const session = await operation()
      if (mounted.current) setActiveSession(session)
      return true
    } catch (cause) {
      if (mounted.current) setErrors((current) => ({ ...current, [key]: messageFrom(cause) }))
      return false
    } finally {
      busy.current.delete(key)
      if (mounted.current) setBusyKeys(new Set(busy.current))
    }
  }, [])

  const start = useCallback(async (planId: number, dayId: number) => {
    if (busy.current.size > 0) return false
    busy.current.add('start')
    setBusyKeys(new Set(busy.current))
    setMessage('')
    try {
      const session = await repository.start(planId, dayId)
      if (mounted.current) setActiveSession(session)
      return true
    } catch (cause) {
      if (mounted.current) setMessage(messageFrom(cause))
      return false
    } finally {
      busy.current.delete('start')
      if (mounted.current) setBusyKeys(new Set(busy.current))
    }
  }, [repository])

  const updateSet = useCallback((exerciseId: number, setId: number, input: SetLogInput) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(`set:${setId}`, () => repository.updateSet(activeSession.id, exerciseId, setId, input))
  }, [activeSession, mutate, repository])

  const addSet = useCallback((exerciseId: number) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(`exercise:${exerciseId}`, () => repository.addSet(activeSession.id, exerciseId))
  }, [activeSession, mutate, repository])

  const removeSet = useCallback((exerciseId: number, setId: number) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(`set:${setId}`, () => repository.removeSet(activeSession.id, exerciseId, setId))
  }, [activeSession, mutate, repository])

  const setExerciseStatus = useCallback((exerciseId: number, status: SessionExerciseStatus) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `exercise:${exerciseId}`,
      () => repository.updateExerciseStatus(activeSession.id, exerciseId, status),
    )
  }, [activeSession, mutate, repository])

  const updateExerciseNotes = useCallback((exerciseId: number, notes: string) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `exercise-note:${exerciseId}`,
      () => repository.updateExerciseNotes(activeSession.id, exerciseId, notes),
    )
  }, [activeSession, mutate, repository])

  const updateSessionNotes = useCallback((notes: string) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate('session-note', () => repository.updateSessionNotes(activeSession.id, notes))
  }, [activeSession, mutate, repository])

  const substituteExercise = useCallback((exerciseId: number, replacementId: number, reason: string) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `substitution:${exerciseId}`,
      () => repository.substituteExercise(activeSession.id, exerciseId, replacementId, reason),
    )
  }, [activeSession, mutate, repository])

  const undoSubstitution = useCallback((exerciseId: number) => {
    if (!activeSession) return Promise.resolve(false)
    return mutate(
      `substitution:${exerciseId}`,
      () => repository.undoSubstitution(activeSession.id, exerciseId),
    )
  }, [activeSession, mutate, repository])

  const applySuggestion = useCallback(async (
    exerciseId: number,
    suggestion: LocalProgressionSuggestion,
  ) => {
    if (!activeSession?.exercises.some((item) => item.id === exerciseId)) return false
    return mutate(
      `suggestion:${exerciseId}`,
      () => repository.applyProgression(activeSession.id, exerciseId, suggestion),
    )
  }, [activeSession, mutate, repository])

  const pause = useCallback(async () => {
    if (!activeSession) return false
    const success = await mutate('session', () => repository.pause(activeSession.id))
    if (success) {
      setRestTimer((current) => {
        if (!current || current.paused) return current
        const next = { ...current, paused: true, pausedAt: Date.now() }
        void restTimerStorage.set(next)
        return next
      })
    }
    return success
  }, [activeSession, mutate, repository])

  const resume = useCallback(async () => {
    if (!activeSession) return false
    const success = await mutate('session', () => repository.resume(activeSession.id))
    if (success) {
      setRestTimer((current) => {
        if (!current?.paused) return current
        const next = resumeRestTimer(current)
        void restTimerStorage.set(next)
        return next
      })
    }
    return success
  }, [activeSession, mutate, repository])

  const finish = useCallback(async (operation: (id: number) => Promise<WorkoutSession>) => {
    if (!activeSession || busy.current.size > 0) return false
    busy.current.add('session')
    setBusyKeys(new Set(busy.current))
    try {
      const finished = await operation(activeSession.id)
      if (mounted.current) {
        setSessions((current) => [finished, ...current.filter((item) => item.id !== finished.id)])
        setActiveSession(null)
        setRestTimer(null)
      }
      await restTimerStorage.clear()
      await onChanged?.()
      return true
    } catch (cause) {
      if (mounted.current) setErrors((current) => ({ ...current, session: messageFrom(cause) }))
      return false
    } finally {
      busy.current.delete('session')
      if (mounted.current) setBusyKeys(new Set(busy.current))
    }
  }, [activeSession, onChanged])

  const startRest = useCallback((exerciseId: number, setId: number, seconds: number) => {
    if (!activeSession || seconds <= 0) return
    const timer: RestTimerState = {
      sessionId: activeSession.id,
      exerciseId,
      setId,
      endsAt: Date.now() + seconds * 1000,
      paused: false,
    }
    setRestTimer(timer)
    void restTimerStorage.set(timer)
  }, [activeSession])

  const adjustRest = useCallback((seconds: number) => {
    setRestTimer((current) => {
      if (!current) return null
      const next = adjustRestTimer(current, seconds)
      void restTimerStorage.set(next)
      return next
    })
  }, [])

  const skipRest = useCallback(() => {
    setRestTimer(null)
    void restTimerStorage.clear()
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
    updateExerciseNotes,
    updateSessionNotes,
    substituteExercise,
    undoSubstitution,
    applySuggestion,
    pause,
    resume,
    complete: (rpe: number | null, notes: string) =>
      finish((id) => repository.complete(id, rpe, notes)),
    abandon: () => finish((id) => repository.abandon(id)),
    startRest,
    adjustRest,
    skipRest,
  }
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.'
}

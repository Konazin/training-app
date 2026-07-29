import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { trainingApi } from '../../services/trainingApi'
import { bootstrapApp } from './bootstrap'

export type BootstrapState = 'loading' | 'ready' | 'error'

export function useAppBootstrap(
  refreshTraining: () => Promise<void>,
  refreshPlans: () => Promise<void>,
  refreshSession: () => Promise<void>,
) {
  const [state, setState] = useState<BootstrapState>('loading')
  const [message, setMessage] = useState('')
  const running = useRef(false)

  const run = useCallback(async () => {
    if (running.current) return
    running.current = true
    setState('loading')
    setMessage('')
    try {
      await bootstrapApp(trainingApi.getHealth, [refreshSession, refreshPlans, refreshTraining])
      setState('ready')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível iniciar o aplicativo.')
      setState('error')
    } finally {
      running.current = false
    }
  }, [refreshPlans, refreshSession, refreshTraining])

  useEffect(() => { void run() }, [run])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state === 'ready') void run()
    })
    return () => subscription.remove()
  }, [run, state])

  return { state, message, retry: run }
}

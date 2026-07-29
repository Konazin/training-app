import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { trainingApi } from '../../services/trainingApi'
import { bootstrapApp, singleFlight } from './bootstrap'

export type BootstrapState = 'loading' | 'ready' | 'error'

export function useAppBootstrap(
  refreshTraining: () => Promise<boolean>,
  refreshPlans: () => Promise<boolean>,
  refreshSession: () => Promise<boolean>,
) {
  const [state, setState] = useState<BootstrapState>('loading')
  const [message, setMessage] = useState('')
  const operationRef = useRef<(background: boolean) => Promise<void>>(async () => {})

  operationRef.current = async (background: boolean) => {
    if (!background) {
      setState('loading')
      setMessage('')
    }
    try {
      await bootstrapApp(trainingApi.getHealth, [refreshSession, refreshPlans, refreshTraining])
      setState('ready')
      setMessage('')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível iniciar o aplicativo.')
      if (!background) setState('error')
    }
  }

  const runnerRef = useRef(singleFlight((background: boolean) => operationRef.current(background)))
  const run = useCallback((background = false) => runnerRef.current(background), [])

  useEffect(() => { void run(false) }, [run])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state === 'ready') void run(true)
    })
    return () => subscription.remove()
  }, [run, state])

  return { state, message, retry: () => run(false) }
}

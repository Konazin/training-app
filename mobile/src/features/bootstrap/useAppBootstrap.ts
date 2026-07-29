import { useCallback, useEffect, useRef, useState } from 'react'
import { bootstrapApp, singleFlight } from './bootstrap'

export type BootstrapState = 'loading' | 'ready' | 'error'

export function useAppBootstrap(refreshers: Array<() => Promise<boolean>>) {
  const [state, setState] = useState<BootstrapState>('loading')
  const [message, setMessage] = useState('')
  const refreshersRef = useRef(refreshers)
  refreshersRef.current = refreshers

  const operation = useRef(singleFlight(async () => {
    setState('loading')
    setMessage('')
    try {
      await bootstrapApp(refreshersRef.current)
      setState('ready')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados locais.')
      setState('error')
    }
  }))
  const retry = useCallback(() => operation.current(), [])
  useEffect(() => { void retry() }, [retry])
  return { state, message, retry }
}

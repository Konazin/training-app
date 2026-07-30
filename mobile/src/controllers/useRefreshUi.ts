import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { localDateKey } from '@training/training-domain'
import type { RefreshAllResult } from './refreshAll'

export function useLocalCalendarClock() {
  const [clock, setClock] = useState(readLocalClock)
  const refreshClock = useCallback(() => setClock(readLocalClock()), [])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshClock()
    })
    return () => subscription.remove()
  }, [refreshClock])
  return { clock, refreshClock }
}

export function useRefreshOnFocus(onFocus: () => void) {
  useFocusEffect(useCallback(() => {
    onFocus()
  }, [onFocus]))
}

export function useRefreshUi(
  refreshAll: () => Promise<RefreshAllResult>,
  onSettled?: () => void,
) {
  const [refreshing, setRefreshing] = useState(false)
  const [warning, setWarning] = useState('')
  const mountedRef = useRef(false)
  const refreshingRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    if (mountedRef.current) setRefreshing(true)
    try {
      const result = await refreshAll()
      if (mountedRef.current) {
        setWarning(result.success
          ? ''
          : `Algumas informações não puderam ser atualizadas: ${result.failedParts.join(', ')}.`)
      }
    } catch {
      if (mountedRef.current) setWarning('Não foi possível atualizar as informações.')
    } finally {
      refreshingRef.current = false
      if (mountedRef.current) {
        setRefreshing(false)
        onSettled?.()
      }
    }
  }, [onSettled, refreshAll])
  return { refresh, refreshing, warning }
}

function readLocalClock() {
  const now = new Date()
  return { dateKey: localDateKey(now), now }
}

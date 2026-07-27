import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { useNavigation, usePreventRemove } from '@react-navigation/native'

export function useUnsavedChangesGuard(value: unknown) {
  const navigation = useNavigation()
  const current = normalize(value)
  const currentRef = useRef(current)
  const snapshotRef = useRef(current)
  const alertOpenRef = useRef(false)
  const pendingRef = useRef<(() => void) | null>(null)
  const [revision, setRevision] = useState(0)
  currentRef.current = current
  const dirty = current !== snapshotRef.current

  usePreventRemove(dirty, ({ data }) => {
    if (alertOpenRef.current) return
    alertOpenRef.current = true
    Alert.alert(
      'Descartar alterações?',
      'Você possui alterações não salvas.',
      [
        {
          text: 'Continuar editando',
          style: 'cancel',
          onPress: () => { alertOpenRef.current = false },
        },
        {
          text: 'Descartar alterações',
          style: 'destructive',
          onPress: () => {
            alertOpenRef.current = false
            snapshotRef.current = currentRef.current
            pendingRef.current = () => navigation.dispatch(data.action)
            setRevision((value) => value + 1)
          },
        },
      ],
      { cancelable: false },
    )
  })

  useEffect(() => {
    const pending = pendingRef.current
    pendingRef.current = null
    pending?.()
  }, [revision])

  const commit = useCallback((nextValue: unknown, afterCommit?: () => void) => {
    snapshotRef.current = normalize(nextValue)
    pendingRef.current = afterCommit ?? null
    setRevision((value) => value + 1)
  }, [])

  return { dirty, commit }
}

function normalize(value: unknown) {
  return JSON.stringify(value, (_key, item) => typeof item === 'string' ? item.trim() : item)
}

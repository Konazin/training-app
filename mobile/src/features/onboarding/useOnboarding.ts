import { useCallback, useEffect, useRef, useState } from 'react'
import {
  APP_METADATA_KEYS,
  type AppMetadataRepository,
} from '@training/training-local-db'

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

export function useOnboarding(metadata: AppMetadataRepository) {
  const mounted = useRef(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    mounted.current = true
    void Promise.all([
      metadata.get(APP_METADATA_KEYS.onboardingEligible, isBoolean),
      metadata.get(APP_METADATA_KEYS.onboardingComplete, isBoolean),
    ]).then(([eligible, complete]) => {
      if (mounted.current) setVisible(eligible === true && complete !== true)
    }).catch(() => undefined)
    return () => {
      mounted.current = false
    }
  }, [metadata])

  const close = useCallback(async () => {
    try {
      await metadata.set(APP_METADATA_KEYS.onboardingComplete, true)
      if (mounted.current) setVisible(false)
    } catch {
      // Mantém a apresentação visível quando não foi possível persistir a conclusão.
    }
  }, [metadata])

  return {
    visible,
    complete: close,
    skip: close,
    reopen: () => setVisible(true),
  }
}

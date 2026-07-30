import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { feedbackColors } from '../theme/uiContracts'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'
export type ToastActionResult = boolean | void

export async function executeToastAction(
  action: () => ToastActionResult | Promise<ToastActionResult>,
) {
  try {
    return await action() !== false
  } catch {
    return false
  }
}

export function Toast({
  message,
  kind = 'info',
  actionLabel,
  actionBusyLabel,
  onAction,
  duration = 4500,
  notificationId,
  onDismiss,
}: {
  message: string
  kind?: ToastKind
  actionLabel?: string
  actionBusyLabel?: string
  onAction?: () => ToastActionResult | Promise<ToastActionResult>
  duration?: number
  notificationId?: number
  onDismiss?: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actionRunningRef = useRef(false)
  const currentKeyRef = useRef('')
  const dismissedKeyRef = useRef<string | null>(null)
  const visibleRef = useRef(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  const toastKey = `${notificationId ?? 'message'}:${message}`
  currentKeyRef.current = toastKey

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const close = useCallback((key: string) => {
    if (currentKeyRef.current !== key || dismissedKeyRef.current === key) return
    clearTimer()
    dismissedKeyRef.current = key
    visibleRef.current = false
    setVisible(false)
    dismissRef.current?.()
  }, [clearTimer])

  const scheduleClose = useCallback((key: string) => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      if (!actionRunningRef.current) close(key)
    }, duration)
  }, [clearTimer, close, duration])

  useEffect(() => {
    clearTimer()
    actionRunningRef.current = false
    dismissedKeyRef.current = null
    visibleRef.current = Boolean(message)
    setActionBusy(false)
    setVisible(Boolean(message))
    if (message) scheduleClose(toastKey)
    return clearTimer
  }, [clearTimer, message, notificationId, scheduleClose, toastKey])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(Platform.OS === 'ios' ? event.endCoordinates.height : 0)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  if (!message || !visible) return null
  const palette = toastColors(colors, kind)
  const runAction = async (
    key: string,
    action: () => ToastActionResult | Promise<ToastActionResult>,
  ) => {
    if (
      currentKeyRef.current !== key
      || !visibleRef.current
      || actionRunningRef.current
    ) return
    clearTimer()
    actionRunningRef.current = true
    setActionBusy(true)
    const shouldClose = await executeToastAction(action)
    if (currentKeyRef.current !== key) return
    actionRunningRef.current = false
    setActionBusy(false)
    if (shouldClose) close(key)
    else scheduleClose(key)
  }
  return (
    <View
      accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}
      style={[styles.toast, {
        backgroundColor: palette.background,
        borderColor: palette.border,
        bottom: keyboardHeight + insets.bottom + 76,
      }]}
    >
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      {!!actionLabel && !!onAction && (
        <Pressable
          accessibilityLabel={actionBusy ? actionBusyLabel ?? actionLabel : actionLabel}
          accessibilityRole="button"
          accessibilityState={{ busy: actionBusy, disabled: actionBusy }}
          disabled={actionBusy}
          onPress={() => void runAction(toastKey, onAction)}
          style={styles.action}
        >
          <Text style={[styles.actionText, { color: palette.text }]}>
            {actionBusy ? actionBusyLabel ?? actionLabel : actionLabel}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityLabel="Fechar mensagem"
        accessibilityRole="button"
        accessibilityState={{ disabled: actionBusy }}
        disabled={actionBusy}
        hitSlop={8}
        onPress={() => close(toastKey)}
        style={[styles.close, actionBusy && styles.disabled]}
      >
        <Text style={[styles.closeText, { color: palette.text }]}>×</Text>
      </Pressable>
    </View>
  )
}

export function toastColors(colors: ReturnType<typeof useTheme>['colors'], kind: ToastKind) {
  return feedbackColors(colors, kind)
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    left: shared.screen.horizontalPadding,
    paddingLeft: shared.spacing.lg,
    position: 'absolute',
    right: shared.screen.horizontalPadding,
    zIndex: 50,
  },
  message: { ...typography.label, flex: 1, fontWeight: '700', paddingVertical: shared.spacing.md },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 8 },
  actionText: { ...typography.label, fontWeight: '900', textDecorationLine: 'underline' },
  close: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  closeText: { fontSize: 24, lineHeight: 28 },
  disabled: { opacity: 0.55 },
})

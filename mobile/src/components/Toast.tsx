import { useEffect, useState } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { feedbackColors } from '../theme/uiContracts'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export function Toast({ message, kind = 'info' }: { message: string; kind?: ToastKind }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    setVisible(Boolean(message))
    if (!message) return
    const timer = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(timer)
  }, [message])
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
  return (
    <View accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'} style={[styles.toast, {
      backgroundColor: palette.background,
      borderColor: palette.border,
      bottom: keyboardHeight + insets.bottom + 76,
    }]}>
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      <Pressable accessibilityLabel="Fechar mensagem" accessibilityRole="button" hitSlop={8} onPress={() => setVisible(false)} style={styles.close}>
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
  close: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  closeText: { fontSize: 24, lineHeight: 28 },
})

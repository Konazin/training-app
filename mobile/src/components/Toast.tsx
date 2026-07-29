import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, useTheme } from '../theme'
import { typography } from '../theme/typography'

type ToastKind = 'info' | 'success' | 'error'

export function Toast({ message, kind = 'info' }: { message: string; kind?: ToastKind }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(Boolean(message))
    if (!message) return
    const timer = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(timer)
  }, [message])

  if (!message || !visible) return null
  const palette = {
    info: { background: colors.surface, border: colors.focus },
    success: { background: colors.successSurface, border: colors.success },
    error: { background: colors.dangerSurface, border: colors.danger },
  }[kind]
  return (
    <View accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: palette.background, borderColor: palette.border, top: insets.top + shared.spacing.sm }]}>
      <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
      <Pressable accessibilityLabel="Fechar mensagem" accessibilityRole="button" hitSlop={8} onPress={() => setVisible(false)} style={styles.close}>
        <Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text>
      </Pressable>
    </View>
  )
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

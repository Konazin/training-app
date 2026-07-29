import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { BootstrapState } from './useAppBootstrap'
import { useTheme } from '../../theme'

export function BootstrapScreen({ state, message, onRetry }: {
  state: Exclude<BootstrapState, 'ready'>
  message: string
  onRetry: () => void
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.mark, { color: colors.ink }]}>TRAINING</Text>
      <Text style={[styles.title, { color: colors.ink }]}>
        {state === 'loading' ? 'Preparando seus treinos…' : 'Não foi possível conectar'}
      </Text>
      {state === 'error' && <>
        <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
        <Text style={[styles.address, { color: colors.gray500 }]}>
          API: {process.env.EXPO_PUBLIC_API_URL || 'não configurada'}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Tentar novamente</Text>
        </Pressable>
      </>}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  mark: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  message: { lineHeight: 20, marginTop: 12, textAlign: 'center' },
  address: { fontSize: 11, marginTop: 8, textAlign: 'center' },
  button: { borderRadius: 14, marginTop: 22, paddingHorizontal: 22, paddingVertical: 15 },
})

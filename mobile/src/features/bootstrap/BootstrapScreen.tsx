import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme'

export function BootstrapScreen({ state, message, onRetry, migrationName, onExportDiagnostic }: {
  state: string
  message: string
  onRetry: () => void
  migrationName?: string
  onExportDiagnostic?: () => void
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.mark, { color: colors.ink }]}>TRAINING</Text>
      <Text style={[styles.title, { color: colors.ink }]}>
        {state === 'migrating_data'
          ? 'Atualizando seus dados…'
          : state === 'error'
            ? 'Não foi possível abrir os dados locais'
            : 'Preparando seus treinos…'}
      </Text>
      {state === 'migrating_data' && !!migrationName && (
        <Text style={[styles.address, { color: colors.gray500 }]}>{migrationName}</Text>
      )}
      {state === 'error' && <>
        <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
        <Text style={[styles.address, { color: colors.gray500 }]}>
          Seus dados não serão apagados automaticamente.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Tentar novamente</Text>
        </Pressable>
        {!!onExportDiagnostic && (
          <Pressable accessibilityRole="button" onPress={onExportDiagnostic}>
            <Text style={[styles.diagnostic, { color: colors.ink }]}>Exportar diagnóstico</Text>
          </Pressable>
        )}
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
  diagnostic: { fontSize: 12, fontWeight: '700', marginTop: 18 },
})

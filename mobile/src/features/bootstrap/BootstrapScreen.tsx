import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { Screen } from '../../components/Screen'
import { useTheme } from '../../theme'
import { fontFamilies } from '../../theme/typography'

export function BootstrapScreen({ state, message, onRetry, migrationName, onExportDiagnostic }: {
  state: string
  message: string
  onRetry: () => void
  migrationName?: string
  onExportDiagnostic?: () => void
}) {
  const { colors } = useTheme()
  return (
    <Screen style={styles.screen}>
      <Text style={[styles.mark, { color: colors.ink }]}>TRAINING</Text>
      {state !== 'error' && <ActivityIndicator accessibilityLabel="Preparando os dados locais" color={colors.tx} />}
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
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.button, { backgroundColor: colors.ac }, pressed && styles.pressed]}>
          <Text style={{ color: colors.on, fontFamily: fontFamilies.text, fontWeight: '500' }}>Tentar novamente</Text>
        </Pressable>
        {!!onExportDiagnostic && (
          <Pressable accessibilityRole="button" onPress={onExportDiagnostic}>
            <Text style={[styles.diagnostic, { color: colors.ink }]}>Exportar diagnóstico</Text>
          </Pressable>
        )}
      </>}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  mark: { fontFamily: fontFamilies.data, fontSize: 12, marginBottom: 18 },
  title: { fontFamily: fontFamilies.text, fontSize: 24, fontWeight: '500', textAlign: 'center' },
  message: { fontFamily: fontFamilies.text, lineHeight: 20, marginTop: 12, textAlign: 'center' },
  address: { fontFamily: fontFamilies.data, fontSize: 12, marginTop: 8, textAlign: 'center' },
  button: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', marginTop: 22, minHeight: 56, paddingHorizontal: 22 },
  diagnostic: { fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.75 },
})

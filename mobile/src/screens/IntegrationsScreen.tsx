import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import type { RootStackParamList } from '../navigation/types'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { listExerciseProviders } from '@training/training-domain'

export function IntegrationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <ScreenScrollView>
      <ScreenHeader
        eyebrow="Conexões opcionais"
        title="Integrações"
        description="A rede só é usada quando você inicia uma consulta."
      />
      {listExerciseProviders().map((provider) => (
        <Pressable
          key={provider.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('WgerIntegration')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.logo}><Text style={styles.logoText}>{provider.name[0]}</Text></View>
          <View style={styles.copy}>
            <Text style={styles.title}>Catálogo {provider.name}</Text>
            <Text style={styles.detail}>Busca exercícios públicos e salva uma cópia no aparelho.</Text>
            <Text style={styles.status}>Manual · Requer internet · Sem sincronização automática</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 92,
    padding: 16,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  logoText: { color: colors.onPrimary, fontSize: 22, fontWeight: '900' },
  copy: { flex: 1 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '800' },
  detail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 5 },
  status: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', marginTop: 7 },
  arrow: { color: colors.textSecondary, fontSize: 18 },
  pressed: { opacity: 0.72 },
})

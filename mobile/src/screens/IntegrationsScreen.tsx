import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, Dumbbell } from 'lucide-react-native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import type { RootStackParamList } from '../navigation/types'
import { type ThemeColors, useTheme } from '../theme'
import { fontFamilies } from '../theme/typography'
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
          accessibilityState={{ disabled: provider.supportState !== 'SUPPORTED' }}
          disabled={provider.supportState !== 'SUPPORTED'}
          onPress={() => {
            if (provider.integrationRoute === 'WGER_CATALOG' || provider.integrationRoute === 'EXERCISEDB_CATALOG') {
              navigation.navigate('WgerIntegration')
            }
          }}
          style={({ pressed }) => [styles.card, provider.supportState !== 'SUPPORTED' && styles.disabled, pressed && styles.pressed]}
        >
          <View style={styles.logo}><Dumbbell color={colors.tx} size={20} strokeWidth={1.7} /></View>
          <View style={styles.copy}>
            <Text style={styles.title}>Catálogo {provider.name}</Text>
            <Text style={styles.detail}>Busca exercícios públicos e salva uma cópia no aparelho.</Text>
            <Text style={styles.status}>
              {provider.supportState === 'SUPPORTED'
                ? 'manual · usa internet · salva localmente'
                : 'indisponível no momento'}
            </Text>
          </View>
          <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />
        </Pressable>
      ))}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: 1, flexDirection: 'row', gap: 14, minHeight: 92, paddingVertical: 16 },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.s2,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  copy: { flex: 1 },
  title: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 16, fontWeight: '500' },
  detail: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 14, lineHeight: 20, marginTop: 5 },
  status: { color: colors.mu, fontFamily: fontFamilies.data, fontSize: 11, marginTop: 7 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
})

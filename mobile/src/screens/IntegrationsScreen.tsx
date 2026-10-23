import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { StyleSheet, Text, View } from 'react-native'
import { ChevronRight, Dumbbell, Sparkles } from 'lucide-react-native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { PressableScale, Reveal } from '../motion'
import type { RootStackParamList } from '../navigation/types'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { listExerciseProviders } from '@training/training-domain'

export function IntegrationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const providers = listExerciseProviders()
  return (
    <ScreenScrollView>
      <Reveal>
        <ScreenHeader
          title="Integrações"
          description="A rede só é usada quando você inicia uma consulta."
        />
      </Reveal>
      {providers.map((provider, index) => {
        const supported = provider.supportState === 'SUPPORTED'
        return (
          <Reveal index={index + 1} key={provider.id}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: !supported }}
              disabled={!supported}
              onPress={() => {
                if (provider.integrationRoute === 'WGER_CATALOG' || provider.integrationRoute === 'EXERCISEDB_CATALOG') {
                  navigation.navigate('WgerIntegration')
                }
              }}
              pressedScale={0.99}
              style={[styles.card, !supported && styles.disabled]}
            >
              <View style={styles.logo}><Dumbbell color={colors.tx} size={20} strokeWidth={1.7} /></View>
              <View style={styles.copy}>
                <Text style={styles.title}>Catálogo {provider.name}</Text>
                <Text style={styles.detail}>Busca exercícios públicos e salva uma cópia no aparelho.</Text>
                <Text style={styles.status}>
                  {supported ? 'Manual · Requer internet · Sem sincronização automática' : 'Indisponível no momento'}
                </Text>
              </View>
              <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />
            </PressableScale>
          </Reveal>
        )
      })}
      <Reveal index={providers.length + 1}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => navigation.navigate('NutritionAiSettings')}
          pressedScale={0.99}
          style={styles.card}
        >
          <View style={styles.logo}><Sparkles color={colors.tx} size={20} strokeWidth={1.7} /></View>
          <View style={styles.copy}>
            <Text style={styles.title}>Gemini · IA da Nutrição</Text>
            <Text style={styles.detail}>Chave pessoal para estimar refeições por foto e sugerir cardápios.</Text>
            <Text style={styles.status}>Opcional · Requer internet · Chave guardada com segurança no aparelho</Text>
          </View>
          <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />
        </PressableScale>
      </Reveal>
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 16, minHeight: 96, paddingVertical: 16 },
  logo: { alignItems: 'center', backgroundColor: colors.s1, borderRadius: shared.radii.md, height: 48, justifyContent: 'center', width: 48 },
  copy: { flex: 1 },
  title: { ...typography.titleSmall, color: colors.tx },
  detail: { ...typography.bodySmall, color: colors.t2, marginTop: 4 },
  status: { ...typography.captionSmall, color: colors.mu, marginTop: 6 },
  disabled: { opacity: 0.55 },
})

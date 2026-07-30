import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { ScreenScrollView } from '../../components/Screen'
import { type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

const STEPS = [
  {
    title: 'Seus treinos ficam no aparelho',
    description: 'O aplicativo funciona offline e guarda os dados localmente. Nenhuma conta é necessária.',
  },
  {
    title: 'Comece pela sua ficha',
    description: 'Crie ou selecione uma ficha de treino. O aplicativo não cria nem altera um plano sem sua ação.',
  },
  {
    title: 'Biblioteca, backup e integrações',
    description: 'Explore exercícios, exporte backups e consulte integrações manualmente quando houver internet.',
  },
] as const

export function Onboarding({
  visible,
  onSkip,
  onComplete,
}: {
  visible: boolean
  onSkip: () => Promise<void>
  onComplete: () => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const { colors } = useTheme()
  const styles = createStyles(colors)
  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])
  const last = step === STEPS.length - 1
  const current = STEPS[step]!

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => void onSkip()}
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScreenScrollView contentContainerStyle={styles.content}>
            <Text style={styles.progress}>PASSO {step + 1} DE {STEPS.length}</Text>
            <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void onSkip()}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Pular</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => last ? void onComplete() : setStep((value) => value + 1)}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>{last ? 'Concluir' : 'Próximo'}</Text>
              </Pressable>
            </View>
          </ScreenScrollView>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: '88%',
    maxWidth: 520,
    overflow: 'hidden',
    width: '100%',
  },
  content: { padding: 24 },
  progress: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.textPrimary, marginTop: 16 },
  description: { ...typography.body, color: colors.textSecondary, marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryText: { ...typography.label, color: colors.onPrimary, fontWeight: '800' },
  secondary: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryText: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
})

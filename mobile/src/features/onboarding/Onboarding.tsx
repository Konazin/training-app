import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { WGER_STARTER_PACK } from '@training/training-domain'

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
  onOpenWger,
  onCreateCustom,
}: {
  visible: boolean
  onSkip: () => Promise<void>
  onComplete: () => Promise<void>
  onOpenWger?: () => void
  onCreateCustom?: () => void
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
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={() => void onSkip()}
        style={styles.backdrop}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            <Text style={styles.progress}>PASSO {step + 1} DE {STEPS.length}</Text>
            <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}</Text>
            {last && (
              <View style={styles.choices}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  disabled
                  style={[styles.choice, styles.disabled]}
                >
                  <Text style={styles.choiceTitle}>Importar pacote recomendado</Text>
                  <Text style={styles.choiceDetail}>Pacote atual · {WGER_STARTER_PACK.length} exercícios</Text>
                  <Text style={styles.choiceDetail}>O pacote recomendado contém exercícios revisados individualmente. A quantidade pode variar conforme a disponibilidade e a qualidade dos dados do provider.</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void onComplete().then(onOpenWger)}
                  style={styles.choice}
                >
                  <Text style={styles.choiceTitle}>Pesquisar no Wger</Text>
                  <Text style={styles.choiceDetail}>Requer internet e só consulta após sua ação.</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void onComplete().then(onCreateCustom)}
                  style={styles.choice}
                >
                  <Text style={styles.choiceTitle}>Criar exercício personalizado</Text>
                  <Text style={styles.choiceDetail}>Conteúdo escrito e controlado por você.</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
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
              <Text style={styles.primaryText}>{last ? 'Continuar sem exercícios' : 'Próximo'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
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
    minHeight: 320,
    overflow: 'hidden',
    width: '100%',
  },
  scroll: { flexShrink: 1 },
  content: { flexGrow: 1, padding: 24 },
  progress: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.textPrimary, marginTop: 16 },
  description: { ...typography.body, color: colors.textSecondary, marginTop: 12 },
  choices: { gap: 10, marginTop: 20 },
  choice: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
    padding: 12,
  },
  disabled: { opacity: 0.55 },
  choiceTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  choiceDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
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

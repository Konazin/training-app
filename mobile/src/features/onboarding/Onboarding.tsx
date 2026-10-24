import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { easeOut, PressableScale, Reveal, useMotion } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { WGER_STARTER_PACK } from '@training/training-domain'
import { recommendedPackEnabled } from '@training/training-domain'

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
  onOpenLibrary,
  onCreateCustom,
  onImportStarterPack,
  starterPackEnabled = recommendedPackEnabled(WGER_STARTER_PACK.length, 0),
  starterPackBusy = false,
}: {
  visible: boolean
  onSkip: () => Promise<void>
  onComplete: () => Promise<void>
  onOpenWger?: () => void
  onOpenLibrary?: () => void
  onCreateCustom?: () => void
  onImportStarterPack?: () => void
  starterPackEnabled?: boolean
  starterPackBusy?: boolean
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
          <View
            accessibilityLabel={`Passo ${step + 1} de ${STEPS.length}`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}
            style={styles.dots}
          >
            {STEPS.map((item, index) => <StepDot active={index === step} done={index < step} key={item.title} />)}
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            <Reveal key={step}>
              <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
              <Text style={styles.description}>{current.description}</Text>
              {last && (
                <View style={styles.choices}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !starterPackEnabled || starterPackBusy, busy: starterPackBusy }}
                    disabled={!starterPackEnabled || starterPackBusy}
                    onPress={() => void onComplete().then(() => {
                      onOpenLibrary?.()
                      onImportStarterPack?.()
                    })}
                    pressedScale={0.99}
                    style={[styles.choice, (!starterPackEnabled || starterPackBusy) && styles.disabled]}
                  >
                    <Text style={styles.choiceTitle}>Importar pacote recomendado</Text>
                    <Text style={styles.choiceDetail}>Pacote atual · {WGER_STARTER_PACK.length} exercícios</Text>
                    <Text style={styles.choiceDetail}>O pacote recomendado contém exercícios revisados individualmente. A quantidade pode variar conforme a disponibilidade e a qualidade dos dados do provider.</Text>
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    onPress={() => void onComplete().then(onOpenWger)}
                    pressedScale={0.99}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceTitle}>Explorar catálogo externo</Text>
                    <Text style={styles.choiceDetail}>Requer internet e só consulta após sua ação.</Text>
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    onPress={() => void onComplete().then(onCreateCustom)}
                    pressedScale={0.99}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceTitle}>Criar exercício personalizado</Text>
                    <Text style={styles.choiceDetail}>Conteúdo escrito e controlado por você.</Text>
                  </PressableScale>
                </View>
              )}
            </Reveal>
          </ScrollView>
          <View style={styles.actions}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => void onSkip()}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Pular</Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              onPress={() => last ? void onComplete() : setStep((value) => value + 1)}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{last ? 'Continuar sem exercícios' : 'Próximo'}</Text>
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

/** Ponto de progresso: o ativo se alonga em uma barra; os concluídos ficam preenchidos. */
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  const { colors } = useTheme()
  const motion = useMotion()
  const width = useRef(new Animated.Value(active ? 1 : 0)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { width.setValue(active ? 1 : 0); return }
    const animation = Animated.timing(width, { duration: 280, easing: easeOut, toValue: active ? 1 : 0, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [active, motion.effective, width])
  return (
    <Animated.View
      style={{
        backgroundColor: active || done ? colors.tx : colors.s2,
        borderRadius: 3,
        height: 6,
        width: width.interpolate({ inputRange: [0, 1], outputRange: [6, 28] }),
      }}
    />
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  sheet: {
    flex: 1,
    width: '100%',
  },
  dots: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 24 },
  scroll: { flexShrink: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { ...typography.display, color: colors.tx },
  description: { ...typography.bodyLarge, color: colors.t2, marginTop: 16 },
  choices: { gap: 12, marginTop: 32 },
  choice: {
    backgroundColor: colors.s1,
    borderRadius: shared.radii.lg,
    minHeight: 64,
    padding: 20,
  },
  disabled: { opacity: 0.55 },
  choiceTitle: { ...typography.titleSmall, color: colors.tx },
  choiceDetail: { ...typography.caption, color: colors.t2, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 24,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.ac,
    borderRadius: shared.radii.md,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryText: { ...typography.titleSmall, color: colors.on, fontWeight: '500' },
  secondary: {
    alignItems: 'center',
    borderColor: colors.mu,
    borderRadius: shared.radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 22,
  },
  secondaryText: { ...typography.bodySmall, color: colors.tx, fontWeight: '500' },
})

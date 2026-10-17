import { useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  TRAINING_PLAN_TEMPLATES,
  type TrainingPlanTemplate,
  type TrainingPlanTemplateId,
} from '@training/training-domain'
import { ChevronRight } from 'lucide-react-native'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { fontFamilies } from '../../../theme/typography'
import { TrainingPlanWeekPreview } from './TrainingPlanWeekPreview'

export function TrainingPlanTemplateModal({
  visible,
  previewId,
  onPreview,
  onBack,
  onCancel,
  onUse,
}: {
  visible: boolean
  previewId: TrainingPlanTemplateId | null
  onPreview: (id: TrainingPlanTemplateId) => void
  onBack: () => void
  onCancel: () => void
  onUse: (template: TrainingPlanTemplate) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const preview = TRAINING_PLAN_TEMPLATES.find((template) => template.id === previewId)
  const trainingDays = preview?.days.filter((day) => !day.restDay).length ?? 0
  const firstTemplateRef = useRef<View>(null)
  const returningToList = useRef(false)
  useEffect(() => {
    if (!visible || preview || !returningToList.current) return
    returningToList.current = false
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(firstTemplateRef.current)
      if (node) AccessibilityInfo.setAccessibilityFocus(node)
    })
    return () => cancelAnimationFrame(frame)
  }, [preview, visible])

  const back = () => {
    returningToList.current = true
    onBack()
  }

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
      <SafeAreaView accessibilityViewIsModal style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>
            {preview ? preview.name : 'Começar com um template'}
          </Text>
          {preview ? (
            <>
              <Text style={styles.description}>{preview.description}</Text>
              <Text style={styles.meta}>
                {preview.category || 'Categoria a escolher'} · {preview.difficulty || 'Dificuldade a escolher'}
              </Text>
              <Text style={styles.meta}>
                {trainingDays} dias de treino · {7 - trainingDays} dias de descanso
              </Text>
              <TrainingPlanWeekPreview days={preview.days} />
              <Text style={styles.info}>
                Este template cria a divisão semanal. Os exercícios podem ser adicionados depois na ficha.
              </Text>
            </>
          ) : (
            TRAINING_PLAN_TEMPLATES.map((template) => (
              <Pressable
                accessibilityHint={template.description}
                accessibilityLabel={`${template.name}, ${template.summary}, ${template.category || 'sem categoria sugerida'}, ${template.difficulty || 'sem dificuldade sugerida'}`}
                accessibilityRole="button"
                key={template.id}
                onPress={() => onPreview(template.id)}
                ref={template.id === TRAINING_PLAN_TEMPLATES[0]!.id ? firstTemplateRef : undefined}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.templateCopy}>
                  <Text style={styles.cardTitle}>{template.name}</Text>
                  {template.id === 'BLANK' && <Text style={styles.startBlank}>Começar do zero</Text>}
                  <Text style={styles.description}>{template.summary}</Text>
                  <Text style={styles.meta}>
                    {template.category || 'Escolha sua categoria'} · {template.difficulty || 'Escolha sua dificuldade'}
                  </Text>
                </View>
                <ChevronRight color={colors.mu} size={18} strokeWidth={1.5} />
              </Pressable>
            ))
          )}
        </ScrollView>
        <View style={styles.actions}>
          {preview && (
            <PrimaryButton
              accessibilityLabel="Voltar para a lista de templates"
              label="Voltar"
              onPress={back}
              secondary
            />
          )}
          <PrimaryButton label="Cancelar" onPress={onCancel} secondary />
          {preview && <PrimaryButton label="Usar este template" onPress={() => onUse(preview)} />}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 10, padding: shared.pagePadding },
  title: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 25, fontWeight: '500', marginBottom: 4 },
  description: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.mu, fontFamily: fontFamilies.data, fontSize: 11, marginTop: 6 },
  card: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: 1, flexDirection: 'row', gap: 14, minHeight: 96, paddingVertical: 14 },
  templateCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 17, fontWeight: '500' },
  startBlank: { color: colors.ac, fontFamily: fontFamilies.text, fontSize: 13, fontWeight: '500' },
  info: { borderLeftColor: colors.bd, borderLeftWidth: 2, color: colors.t2, fontFamily: fontFamilies.text, fontSize: 14, lineHeight: 20, padding: 12 },
  actions: { flexDirection: 'row', gap: 10, padding: shared.pagePadding },
  pressed: { backgroundColor: colors.s2 },
})

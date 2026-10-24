import { useRef } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, Circle } from 'lucide-react-native'
import { type TrainingPlanDuplicateMode } from '@training/training-domain'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { fontFamilies } from '../../../theme/typography'
import type { TrainingPlanUiResult } from '../controller/useTrainingPlanController'

const options: Array<{
  mode: TrainingPlanDuplicateMode
  title: string
  description: string
}> = [
  {
    mode: 'COMPLETE',
    title: 'Duplicar completa',
    description: 'Copia toda a programação, incluindo cargas e notas.',
  },
  {
    mode: 'STRUCTURE_ONLY',
    title: 'Apenas estrutura',
    description: 'Copia a divisão, exercícios, séries e repetições, mas limpa dados pessoais de progressão.',
  },
  {
    mode: 'WITHOUT_LOADS',
    title: 'Sem cargas planejadas',
    description: 'Copia toda a programação e remove apenas as cargas planejadas.',
  },
]

export function TrainingPlanDuplicateModal({
  visible,
  value,
  busy,
  onChange,
  onCancel,
  onConfirm,
  onSuccess,
}: {
  visible: boolean
  value: TrainingPlanDuplicateMode
  busy: boolean
  onChange: (mode: TrainingPlanDuplicateMode) => void
  onCancel: () => void
  onConfirm: () => Promise<TrainingPlanUiResult>
  onSuccess: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const confirmingRef = useRef(false)

  const confirm = async () => {
    if (busy || confirmingRef.current) return
    confirmingRef.current = true
    try {
      if ((await onConfirm()).status === 'success') onSuccess()
    } finally {
      confirmingRef.current = false
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!busy && !confirmingRef.current) onCancel()
      }}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View
          accessibilityLabel={busy ? 'Duplicando ficha…' : 'Escolher modo de duplicação'}
          accessibilityState={{ busy }}
          accessibilityViewIsModal
          style={styles.modal}
        >
          <Text accessibilityRole="header" style={styles.title}>Duplicar ficha</Text>
          {options.map((option) => {
            const selected = value === option.mode
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: busy }}
                disabled={busy}
                key={option.mode}
                onPress={() => onChange(option.mode)}
                style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.description}>{option.description}</Text>
                </View>
                {selected
                  ? <Check color={colors.ac} size={18} strokeWidth={2} />
                  : <Circle color={colors.mu} size={18} strokeWidth={1.5} />}
              </Pressable>
            )
          })}
          {busy && (
            <View accessibilityLiveRegion="polite" style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.description}>Duplicando ficha…</Text>
            </View>
          )}
          <View style={styles.actions}>
            <PrimaryButton
              disabled={busy}
              label="Cancelar"
              onPress={() => {
                if (!confirmingRef.current) onCancel()
              }}
              secondary
            />
            <PrimaryButton disabled={busy} loading={busy} label="Duplicar" onPress={() => void confirm()} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: colors.scrim, flex: 1, justifyContent: 'center', padding: shared.pagePadding },
  modal: { backgroundColor: colors.s1, borderRadius: 12, maxWidth: 480, padding: 20, width: '100%' },
  title: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 22, fontWeight: '500', marginBottom: 12 },
  option: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, minHeight: 76, paddingVertical: 12 },
  selected: { backgroundColor: colors.s2 },
  optionCopy: { flex: 1 },
  optionTitle: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 15, fontWeight: '500' },
  description: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 13, lineHeight: 18, marginTop: 4 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  pressed: { opacity: 0.75 },
})

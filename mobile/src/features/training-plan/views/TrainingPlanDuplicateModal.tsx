import { useRef } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { type TrainingPlanDuplicateMode } from '@training/training-domain'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { PrimaryButton } from '../../../components/PrimaryButton'
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
                style={[styles.option, selected && styles.selected]}
              >
                <Text style={styles.optionTitle}>{selected ? '● ' : '○ '}{option.title}</Text>
                <Text style={styles.description}>{option.description}</Text>
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
  modal: { backgroundColor: colors.surface, borderRadius: 22, maxWidth: 480, padding: 20, width: '100%' },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 12 },
  option: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginBottom: 8, minHeight: 76, padding: 13 },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  optionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
})

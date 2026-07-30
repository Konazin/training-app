import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { shared, type ThemeColors, useTheme } from '../theme'
import { FormField } from './FormField'
import { PrimaryButton } from './PrimaryButton'

const CUSTOM_OPTION = '__CUSTOM__'

export function OptionPickerField({
  label,
  value,
  placeholder,
  error,
  disabled = false,
  onPress,
}: {
  label: string
  value: string
  placeholder: string
  error?: string
  disabled?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityHint={`Abre as opções de ${label.toLocaleLowerCase('pt-BR')}`}
        accessibilityLabel={`${label}, ${value || placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Text accessibilityElementsHidden style={styles.chevron}>⌄</Text>
      </Pressable>
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </View>
  )
}

export function OptionPickerModal({
  visible,
  title,
  options,
  value,
  customLabel,
  disabled = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  title: string
  options: readonly string[]
  value: string
  customLabel: string
  disabled?: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [selection, setSelection] = useState('')
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!visible) return
    const preset = options.includes(value)
    setSelection(preset ? value : value ? CUSTOM_OPTION : '')
    setCustom(preset ? '' : value)
    setError('')
  }, [options, value, visible])

  const confirm = () => {
    const resolved = selection === CUSTOM_OPTION ? custom.trim().replace(/\s+/g, ' ') : selection
    if (!resolved) {
      setError(`Informe ${customLabel.toLocaleLowerCase('pt-BR')}.`)
      return
    }
    if (resolved.length > 50) {
      setError('Use no máximo 50 caracteres.')
      return
    }
    onConfirm(resolved)
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!disabled) onCancel()
      }}
      visible={visible}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContent}
        >
          <View accessibilityViewIsModal style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalDescription}>Selecione uma opção ou informe um valor personalizado.</Text>
          </View>
          <ScrollView contentContainerStyle={styles.options} keyboardShouldPersistTaps="handled">
            {[...options, CUSTOM_OPTION].map((option) => {
              const selected = selection === option
              const label = option === CUSTOM_OPTION ? 'Outra' : option
              return (
                <Pressable
                  accessibilityLabel={label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled }}
                  disabled={disabled}
                  key={option}
                  onPress={() => {
                    setSelection(option)
                    setError('')
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={styles.optionMarker}>{selected ? '●' : '○'}</Text>
                  <Text style={styles.optionText}>{label}</Text>
                  {selected && <Text style={styles.selectedText}>Selecionada</Text>}
                </Pressable>
              )
            })}
            {selection === CUSTOM_OPTION && (
              <FormField
                autoFocus
                disabled={disabled}
                error={error}
                label={customLabel}
                maxLength={50}
                onChangeText={(text) => {
                  setCustom(text)
                  setError('')
                }}
                value={custom}
              />
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            <PrimaryButton disabled={disabled} label="Cancelar" onPress={onCancel} secondary />
            <PrimaryButton disabled={disabled || !selection} label="Confirmar" onPress={confirm} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  modalContent: { flex: 1 },
  modalHeader: { paddingHorizontal: shared.pagePadding, paddingTop: 16 },
  modalTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  modalDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 5 },
  options: { gap: 8, padding: shared.pagePadding },
  option: { alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', minHeight: 56, paddingHorizontal: 16 },
  optionSelected: { borderColor: colors.primary, borderWidth: 2 },
  optionMarker: { color: colors.primary, fontSize: 18, marginRight: 10 },
  optionText: { color: colors.textPrimary, flex: 1, fontSize: 16, fontWeight: '700' },
  selectedText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 10, padding: shared.pagePadding },
  field: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '800', letterSpacing: 0.6, marginBottom: 7 },
  trigger: { alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', minHeight: 56, paddingHorizontal: 16 },
  triggerError: { borderColor: colors.danger },
  value: { color: colors.textPrimary, flex: 1, fontSize: 16 },
  placeholder: { color: colors.textSecondary },
  chevron: { color: colors.textSecondary, fontSize: 22 },
  error: { color: colors.danger, fontSize: 12, marginTop: 6 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
})

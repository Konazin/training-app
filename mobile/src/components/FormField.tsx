import type { ComponentProps } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { formFieldColors } from '../theme/uiContracts'
import { ThemedTextInput } from './ThemedTextInput'

interface Props extends ComponentProps<typeof TextInput> {
  label: string
  error?: string
  disabled?: boolean
}

export function getFormFieldColors(colors: ThemeColors, focused: boolean, error: boolean, disabled: boolean) {
  return formFieldColors(colors, focused, error, disabled)
}

export function FormField({ label, multiline, style, error, disabled = false, onBlur, onFocus, ...props }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const errorId = `${props.nativeID ?? label}-error`
  return (
    <View style={styles.wrapper}>
      <Text nativeID={`${props.nativeID ?? label}-label`} style={styles.label}>{label}</Text>
      <ThemedTextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        error={Boolean(error)}
        onBlur={onBlur}
        onFocus={onFocus}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
      {!!error && <Text nativeID={errorId} style={styles.error}>{error}</Text>}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  input: {
    borderRadius: 15,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiline: {
    minHeight: 120,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  error: { ...typography.caption, color: colors.danger, marginTop: 6 },
})

import { useState, type ComponentProps } from 'react'
import { Platform, StyleSheet, TextInput } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { formFieldColors } from '../theme/uiContracts'
import { typography } from '../theme/typography'

interface Props extends ComponentProps<typeof TextInput> {
  error?: boolean
  disabled?: boolean
  highContrast?: boolean
}

export function ThemedTextInput({
  disabled = false,
  error = false,
  highContrast = false,
  editable,
  onBlur,
  onFocus,
  style,
  ...props
}: Props) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const palette = formFieldColors(colors, focused, error, disabled)
  const cursorColor = highContrast ? colors.workout.timer : palette.cursorColor
  const selectionColor = highContrast ? colors.workout.timer : palette.selectionColor
  return (
    <TextInput
      accessibilityState={{ disabled }}
      cursorColor={Platform.OS === 'android' ? cursorColor : undefined}
      editable={!disabled && editable !== false}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      placeholderTextColor={colors.textSecondary}
      selectionColor={selectionColor}
      style={[styles.input, palette, disabled && styles.disabled, style]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabled: { opacity: 0.7 },
})

export function themedInputColors(colors: ThemeColors, focused: boolean, error: boolean, disabled: boolean) {
  return formFieldColors(colors, focused, error, disabled)
}

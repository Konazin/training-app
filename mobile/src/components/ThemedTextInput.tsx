import { useState, type ComponentProps } from 'react'
import { Platform, StyleSheet, TextInput } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { formFieldColors } from '../theme/uiContracts'
import { typography } from '../theme/typography'

interface Props extends ComponentProps<typeof TextInput> {
  error?: boolean
  disabled?: boolean
}

export function ThemedTextInput({
  disabled = false,
  error = false,
  editable,
  onBlur,
  onFocus,
  style,
  ...props
}: Props) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const palette = formFieldColors(colors, focused, error, disabled)
  return (
    <TextInput
      accessibilityState={{ disabled }}
      cursorColor={Platform.OS === 'android' ? palette.cursorColor : undefined}
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
      selectionColor={palette.selectionColor}
      style={[styles.input, palette, disabled && styles.disabled, style]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 15,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  disabled: { opacity: 0.7 },
})

export function themedInputColors(colors: ThemeColors, focused: boolean, error: boolean, disabled: boolean) {
  return formFieldColors(colors, focused, error, disabled)
}

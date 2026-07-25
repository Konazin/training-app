import type { ComponentProps } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'

interface Props extends ComponentProps<typeof TextInput> {
  label: string
}

export function FormField({ label, multiline, style, ...props }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.gray400}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    color: colors.gray500,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.gray200,
    borderRadius: 15,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
})

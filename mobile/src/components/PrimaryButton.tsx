import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

interface Props {
  label: string
  accessibilityLabel?: string
  onPress: () => void
  loading?: boolean
  secondary?: boolean
  disabled?: boolean
}

export function PrimaryButton({ label, accessibilityLabel, onPress, loading, secondary, disabled = false }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.textPrimary : colors.onPrimary} />
      ) : (
        <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: shared.touchTarget.minimum,
    paddingHorizontal: 18,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  label: {
    color: colors.onPrimary,
    ...typography.label,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
})

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
  highContrast?: boolean
}

export function PrimaryButton({ label, accessibilityLabel, onPress, loading, secondary, disabled = false, highContrast = false }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors, highContrast)
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
        pressed && (secondary ? styles.secondaryPressed : styles.primaryPressed),
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.tx : highContrast ? colors.workout.timerText : colors.on} />
      ) : (
        <Text style={[styles.label, secondary && styles.secondaryLabel, (disabled || loading) && styles.disabledLabel]}>{label}</Text>
      )}
    </Pressable>
  )
}

const createStyles = (colors: ThemeColors, highContrast: boolean) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: highContrast ? colors.workout.timer : colors.ac,
    borderRadius: shared.radii.md,
    justifyContent: 'center',
    minHeight: shared.control.primaryHeight,
    paddingHorizontal: 18,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: highContrast ? colors.workout.border : colors.mu,
    borderWidth: 1,
    minHeight: shared.control.compactHeight,
  },
  label: {
    color: highContrast ? colors.workout.timerText : colors.on,
    ...typography.titleSmall,
  },
  secondaryLabel: {
    color: highContrast ? colors.workout.text : colors.tx,
    ...typography.bodySmall,
    fontWeight: '500',
  },
  primaryPressed: { backgroundColor: highContrast ? colors.workout.textSecondary : colors.primaryPressed },
  secondaryPressed: { backgroundColor: colors.pressed },
  disabled: { backgroundColor: highContrast ? colors.workout.pending : colors.s2, borderColor: highContrast ? colors.workout.border : colors.mu },
  disabledLabel: { color: highContrast ? colors.workout.textSecondary : colors.t2 },
})

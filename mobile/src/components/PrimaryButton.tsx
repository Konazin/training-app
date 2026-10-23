import type { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { PressableScale } from '../motion'

interface Props {
  label: string
  accessibilityLabel?: string
  onPress: () => void
  loading?: boolean
  secondary?: boolean
  /** Ação destrutiva: contorno e texto em vermelho dessaturado, nunca preenchido. */
  danger?: boolean
  disabled?: boolean
  highContrast?: boolean
  icon?: ReactNode
}

export function PrimaryButton({ label, accessibilityLabel, onPress, loading, secondary, danger, disabled = false, highContrast = false, icon }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors, highContrast)
  const inactive = disabled || loading
  const quiet = secondary || danger
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        quiet && styles.quiet,
        danger && styles.danger,
        pressed && !inactive && (quiet ? styles.quietPressed : styles.primaryPressed),
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={quiet ? colors.tx : highContrast ? colors.workout.timerText : colors.on} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, quiet && styles.quietLabel, danger && styles.dangerLabel, inactive && styles.disabledLabel]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  )
}

const createStyles = (colors: ThemeColors, highContrast: boolean) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: highContrast ? colors.workout.timer : colors.ac,
    borderRadius: shared.radii.md,
    justifyContent: 'center',
    minHeight: shared.control.primaryHeight,
    paddingHorizontal: 20,
  },
  content: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.sm },
  quiet: {
    backgroundColor: 'transparent',
    borderColor: highContrast ? colors.workout.border : colors.mu,
    borderWidth: 1,
    minHeight: shared.control.compactHeight,
  },
  danger: { borderColor: colors.dg },
  label: {
    color: highContrast ? colors.workout.timerText : colors.on,
    ...typography.titleSmall,
    fontWeight: '500',
  },
  quietLabel: { color: highContrast ? colors.workout.text : colors.tx, ...typography.bodySmall, fontWeight: '500' },
  dangerLabel: { color: colors.dg },
  primaryPressed: { backgroundColor: highContrast ? colors.workout.textSecondary : colors.primaryPressed },
  quietPressed: { backgroundColor: colors.s2 },
  disabled: { backgroundColor: colors.s2, borderColor: colors.bd },
  disabledLabel: { color: colors.t2 },
})

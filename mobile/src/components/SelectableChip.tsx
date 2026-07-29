import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { selectableChipColors } from '../theme/uiContracts'

export function getSelectableChipColors(colors: ThemeColors, selected: boolean) {
  return selectableChipColors(colors, selected)
}

export function SelectableChip({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const palette = getSelectableChipColors(colors, selected)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        pressed && { backgroundColor: colors.primaryPressed },
        disabled && styles.disabled,
      ]}
    >
      {selected && <View accessibilityElementsHidden style={[styles.check, { borderColor: colors.onPrimary }]} />}
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: shared.spacing.sm,
    minHeight: shared.touchTarget.minimum,
    paddingHorizontal: shared.spacing.lg,
  },
  check: { borderBottomWidth: 2, borderRightWidth: 2, height: 12, transform: [{ rotate: '45deg' }], width: 7 },
  disabled: { opacity: 0.5 },
  label: { ...typography.label, flexShrink: 1, fontWeight: '700' },
})

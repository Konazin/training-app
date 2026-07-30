import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { pressedChipColors, selectableChipColors } from '../theme/uiContracts'

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
  const pressedPalette = pressedChipColors(colors)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed ? pressedPalette.backgroundColor : palette.backgroundColor,
          borderColor: pressed ? pressedPalette.borderColor : palette.borderColor,
        },
        disabled && styles.disabled,
      ]}
    >
      {({ pressed }) => (
        <>
          {selected && <View accessibilityElementsHidden style={[styles.check, { borderColor: colors.onPrimary }]} />}
          <Text style={[styles.label, { color: pressed ? pressedPalette.color : palette.color }]}>{label}</Text>
        </>
      )}
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

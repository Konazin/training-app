import { Check } from 'lucide-react-native'
import { StyleSheet, Text } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { pressedChipColors, selectableChipColors } from '../theme/uiContracts'
import { PressableScale } from '../motion'

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
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={{ bottom: 2, top: 2 }}
      onPress={onPress}
      pressedScale={0.95}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed && !selected ? pressedPalette.backgroundColor : palette.backgroundColor,
          borderColor: pressed && !selected ? pressedPalette.borderColor : palette.borderColor,
        },
        disabled && styles.disabled,
      ]}
    >
      {selected && <Check color={palette.color} size={14} strokeWidth={2.4} />}
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: shared.spacing.xs,
    minHeight: 44,
    paddingHorizontal: shared.spacing.lg,
  },
  disabled: { opacity: 0.5 },
  label: { ...typography.label, flexShrink: 1, fontWeight: '500' },
})

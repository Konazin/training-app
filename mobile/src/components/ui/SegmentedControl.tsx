import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export interface SegmentOption<T extends string> { value: T; label: string; accessibilityLabel?: string }
export function SegmentedControl<T extends string>({ options, value, onChange, label }: { options: readonly SegmentOption<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.container}>{options.map((option) => {
    const selected = option.value === value
    return <Pressable key={option.value} accessibilityLabel={option.accessibilityLabel ?? option.label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}><Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text></Pressable>
  })}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.md, borderWidth: 1, flexDirection: 'row', gap: shared.spacing.xs, padding: shared.spacing.xs },
  option: { alignItems: 'center', borderRadius: shared.radii.sm, flex: 1, justifyContent: 'center', minHeight: shared.touchTarget.minimum, paddingHorizontal: shared.spacing.sm },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: 0.78 },
  label: { ...typography.label, color: colors.textSecondary, fontWeight: '700', textAlign: 'center' },
  selectedLabel: { color: colors.onPrimary },
})

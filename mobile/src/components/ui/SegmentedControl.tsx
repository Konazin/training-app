import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export interface SegmentOption<T extends string> { value: T; label: string; accessibilityLabel?: string }

/** Seletor segmentado com indicador que desliza até a opção ativa. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: { options: readonly SegmentOption<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const { colors, motion } = useTheme()
  const styles = createStyles(colors)
  const [width, setWidth] = useState(0)
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  const position = useRef(new Animated.Value(index)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { position.setValue(index); return }
    const animation = Animated.spring(position, { damping: 20, mass: 0.8, stiffness: 300, toValue: index, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [index, motion.effective, position])
  const inner = Math.max(width - shared.spacing.xs * 2, 0)
  const segment = options.length ? inner / options.length : 0
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.container}>
      {segment > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { left: shared.spacing.xs, width: segment, transform: [{ translateX: position.interpolate({ inputRange: [0, Math.max(options.length - 1, 1)], outputRange: [0, segment * Math.max(options.length - 1, 1)] }) }] }]}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable key={option.value} accessibilityLabel={option.accessibilityLabel ?? option.label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option.value)} style={styles.option}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.s1, borderRadius: shared.radii.md, flexDirection: 'row', padding: shared.spacing.xs },
  indicator: { backgroundColor: colors.ac, borderRadius: shared.radii.sm, bottom: shared.spacing.xs, position: 'absolute', top: shared.spacing.xs },
  option: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: shared.touchTarget.minimum, paddingHorizontal: shared.spacing.sm },
  label: { ...typography.label, color: colors.t2, fontWeight: '500', textAlign: 'center' },
  selectedLabel: { color: colors.on },
})

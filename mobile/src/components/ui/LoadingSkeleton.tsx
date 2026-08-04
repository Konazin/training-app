import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { shared, useTheme } from '../../theme'

export function LoadingSkeleton({ width = '100%', height = 16, radius = shared.radii.sm, style, accessibilityLabel = 'Carregando conteúdo' }: { width?: ViewStyle['width']; height?: number; radius?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const { colors, motion } = useTheme()
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { opacity.setValue(0.62); return }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { duration: shared.motion.slow, toValue: 0.82, useNativeDriver: true }),
      Animated.timing(opacity, { duration: shared.motion.slow, toValue: 0.45, useNativeDriver: true }),
    ]))
    animation.start()
    return () => animation.stop()
  }, [motion.effective, opacity])
  return <Animated.View accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar" style={[styles.base, { backgroundColor: colors.surfaceTertiary, borderRadius: radius, height, opacity, width }, style]} />
}
const styles = StyleSheet.create({ base: { overflow: 'hidden' } })

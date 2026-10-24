import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../theme'
import { useMotion } from './useMotion'
import { easeOut } from './easing'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const CHECK_LENGTH = 22

/**
 * Marca de conclusão: anel vazio quando pendente; preenche e desenha o check ao concluir.
 * O estado se lê pela forma (anel x disco com check), nunca só pela cor.
 */
export function CheckDraw({ checked, size = 32 }: { checked: boolean; size?: number }) {
  const { colors } = useTheme()
  const motion = useMotion()
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    if (motion.effective !== 'FULL') { progress.setValue(checked ? 1 : 0); return }
    const animation = Animated.timing(progress, {
      duration: checked ? 320 : 140,
      easing: easeOut,
      toValue: checked ? 1 : 0,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [checked, motion.effective, progress])
  const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.08, 1] })
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: size, width: size }}>
      <View style={[styles.ring, { borderColor: checked ? colors.tx : colors.mu, borderRadius: size / 2 }]} />
      <Animated.View
        style={[
          styles.disc,
          { backgroundColor: colors.tx, borderRadius: size / 2, opacity: progress, transform: [{ scale }] },
        ]}
      />
      <Svg height={size} style={styles.svg} viewBox="0 0 32 32" width={size}>
        <AnimatedPath
          d="M9 16.5 L14 21.5 L23 11"
          fill="none"
          stroke={colors.bg}
          strokeDasharray={`${CHECK_LENGTH}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0.35, 1], outputRange: [CHECK_LENGTH, 0], extrapolate: 'clamp' })}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.6}
        />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFill, borderWidth: 1.5 },
  disc: { ...StyleSheet.absoluteFill },
  svg: { position: 'absolute' },
})

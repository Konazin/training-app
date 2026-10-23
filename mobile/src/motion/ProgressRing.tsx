import { type ReactNode, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../theme'
import { easeOut } from './easing'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Anel de progresso monocromático. `progress` de 0 a 1; preenche com animação ao montar e ao mudar. */
export function ProgressRing({
  progress,
  size = 64,
  stroke = 5,
  children,
  label,
}: {
  progress: number
  size?: number
  stroke?: number
  children?: ReactNode
  label?: string
}) {
  const { colors, motion } = useTheme()
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 1)
  const value = useRef(new Animated.Value(motion.effective === 'FULL' ? 0 : clamped)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { value.setValue(clamped); return }
    const animation = Animated.timing(value, { duration: 700, easing: easeOut, toValue: clamped, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [clamped, motion.effective, value])
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <View
      accessibilityLabel={label ?? `${Math.round(clamped * 100)}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height: size, width: size }}
    >
      <Svg height={size} style={styles.svg} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={colors.s2} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          origin={`${size / 2}, ${size / 2}`}
          r={radius}
          rotation={-90}
          stroke={colors.tx}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={value.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </Svg>
      {children && <View style={styles.center}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
})

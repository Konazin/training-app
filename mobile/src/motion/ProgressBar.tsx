import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useMotion } from './useMotion'
import { easeOut } from './easing'

/** Barra fina de progresso que cresce até o valor novo. `progress` de 0 a 1. */
export function ProgressBar({ progress, color, trackColor, height = 4 }: { progress: number; color: string; trackColor: string; height?: number }) {
  const motion = useMotion()
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 1)
  const value = useRef(new Animated.Value(clamped)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { value.setValue(clamped); return }
    const animation = Animated.timing(value, { duration: 480, easing: easeOut, toValue: clamped, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [clamped, motion.effective, value])
  return (
    <View style={[styles.track, { backgroundColor: trackColor, borderRadius: height / 2, height }]}>
      <Animated.View style={{ backgroundColor: color, borderRadius: height / 2, height, width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  )
}

const styles = StyleSheet.create({ track: { overflow: 'hidden', width: '100%' } })

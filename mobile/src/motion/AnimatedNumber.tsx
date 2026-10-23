import { useEffect, useRef, useState } from 'react'
import { Animated, Text, type TextProps } from 'react-native'
import { useMotion } from './useMotion'
import { easeOut } from './easing'
import { tweenValue } from './motionMath'

/** Número que rola até o novo valor. Leitores de tela recebem sempre o valor final. */
export function AnimatedNumber({
  value,
  decimals = 0,
  format = (current: number) => current.toLocaleString('pt-BR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }),
  duration = 420,
  ...props
}: { value: number; decimals?: number; format?: (value: number) => string; duration?: number } & TextProps) {
  const motion = useMotion()
  const progress = useRef(new Animated.Value(1)).current
  const from = useRef(value)
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (motion.effective !== 'FULL' || from.current === value) {
      from.current = value
      setShown(value)
      return
    }
    const start = from.current
    progress.setValue(0)
    const id = progress.addListener(({ value: p }) => setShown(tweenValue(start, value, p, decimals)))
    const animation = Animated.timing(progress, { duration, easing: easeOut, toValue: 1, useNativeDriver: false })
    animation.start(() => { from.current = value; setShown(value) })
    return () => { progress.removeListener(id); animation.stop(); from.current = value }
  }, [decimals, duration, motion.effective, progress, value])
  return <Text accessibilityLabel={format(value)} {...props}>{format(shown)}</Text>
}

import { type ReactNode, useRef, useState } from 'react'
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { easeOut } from './easing'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode)
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>)
  /** 1 desliga o encolhimento (por exemplo, em linhas largas de lista). */
  pressedScale?: number
}

/** Pressable que encolhe levemente ao toque. Sem movimento quando o usuário o reduz. */
export function PressableScale({ children, style, pressedScale = 0.97, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const { motion } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const [pressed, setPressed] = useState(false)
  const animate = (to: number, duration: number) => {
    if (motion.effective !== 'FULL') return
    Animated.timing(scale, { duration, easing: easeOut, toValue: to, useNativeDriver: true }).start()
  }
  const state = { pressed }
  const resolvedStyle = typeof style === 'function' ? style(state) : style
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => { setPressed(true); animate(pressedScale, 90); onPressIn?.(event) }}
      onPressOut={(event) => { setPressed(false); animate(1, 220); onPressOut?.(event) }}
      style={[resolvedStyle, { transform: [{ scale }] }]}
    >
      {typeof children === 'function' ? children(state) : children}
    </AnimatedPressable>
  )
}

import { type ReactNode, useEffect, useRef } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'
import { useMotion } from './useMotion'
import { easeOut } from './easing'
import { enterDuration, staggerDelay } from './motionMath'

/**
 * Entrada de conteúdo: sobe 12 dp enquanto aparece. Use `index` em listas para
 * escalonar (até 8 itens). Roda uma vez, na montagem.
 */
export function Reveal({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const motion = useMotion()
  const progress = useRef(new Animated.Value(motion.effective === 'OFF' ? 1 : 0)).current
  useEffect(() => {
    const duration = enterDuration(motion)
    if (!duration) { progress.setValue(1); return }
    const animation = Animated.timing(progress, {
      delay: staggerDelay(index, motion),
      duration,
      easing: easeOut,
      toValue: 1,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
    // Só na montagem: mudar o perfil de movimento depois não deve reanimar a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lift = motion.effective === 'FULL' ? 12 : 0
  return (
    <Animated.View
      style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  )
}

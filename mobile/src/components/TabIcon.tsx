import type { LucideIcon } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { easeOut } from '../motion'
import { useTheme } from '../theme'
import { useMotion } from '../motion/useMotion'

/** Ícone da barra de abas: o ativo sobe 1 dp, engrossa o traço e ganha uma barra indicadora que cresce. */
export function TabIcon({ icon: Icon, focused, color }: { icon: LucideIcon; focused: boolean; color: string }) {
  const { colors } = useTheme()
  const motion = useMotion()
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => {
    if (motion.effective !== 'FULL') { progress.setValue(focused ? 1 : 0); return }
    const animation = Animated.timing(progress, { duration: 220, easing: easeOut, toValue: focused ? 1 : 0, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [focused, motion.effective, progress])
  return (
    <View style={{ alignItems: 'center', gap: 4, width: '100%' }}>
      <Animated.View
        style={{
          backgroundColor: colors.ac,
          borderRadius: 1,
          height: 2,
          opacity: progress,
          transform: [{ scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          width: 24,
        }}
      />
      <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>
        <Icon color={color} size={24} strokeWidth={focused ? 2 : 1.5} />
      </Animated.View>
    </View>
  )
}

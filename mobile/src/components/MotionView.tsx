import { type ReactNode, useEffect, useRef } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export function MotionView({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const { motion } = useTheme()
  const progress = useRef(new Animated.Value(motion.effective === 'OFF' ? 1 : 0)).current

  useEffect(() => {
    if (motion.effective === 'OFF') {
      progress.setValue(1)
      return
    }
    progress.setValue(0)
    const animation = Animated.timing(progress, {
      duration: motion.duration,
      toValue: 1,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [motion.duration, motion.effective, progress])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            ...(motion.translate
              ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.translate, 0] }) }]
              : []),
            ...(motion.scale !== 1
              ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.scale, 1] }) }]
              : []),
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { easeOut } from '../../motion'
import { useMotion } from '../../motion/useMotion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

/** Folha inferior: o fundo escurece e o painel sobe com mola curta. Movimento reduzido vira fade. */
export function BottomSheet({ visible, title, description, children, onClose }: { visible: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const { colors } = useTheme()
  const motion = useMotion()
  const progress = useRef(new Animated.Value(0)).current
  const styles = createStyles(colors)
  useEffect(() => {
    if (!visible) { progress.setValue(0); return }
    if (motion.effective === 'OFF') { progress.setValue(1); return }
    const animation = motion.effective === 'FULL'
      ? Animated.spring(progress, { damping: 22, mass: 0.9, stiffness: 260, toValue: 1, useNativeDriver: true })
      : Animated.timing(progress, { duration: motion.duration, easing: easeOut, toValue: 1, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [motion.duration, motion.effective, progress, visible])
  const rise = motion.effective === 'FULL' ? 40 : 0
  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View accessibilityViewIsModal style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]} />
        <Pressable accessibilityLabel="Fechar painel" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.sheet, { opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [rise + 80, 0] }) }] }]}>
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.s1, borderColor: colors.bd, borderTopLeftRadius: shared.radii.xl, borderTopRightRadius: shared.radii.xl, borderTopWidth: 1, maxHeight: '88%', paddingBottom: shared.spacing.xxl, paddingHorizontal: shared.pagePadding, paddingTop: shared.spacing.sm },
  handle: { alignSelf: 'center', backgroundColor: colors.mu, borderRadius: 2, height: 4, marginBottom: shared.spacing.lg, width: 36 },
  title: { ...typography.title, color: colors.tx },
  description: { ...typography.bodySmall, color: colors.t2, marginTop: shared.spacing.xs },
  content: { marginTop: shared.spacing.lg },
})

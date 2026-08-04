import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function BottomSheet({ visible, title, description, children, onClose }: { visible: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const { colors, motion } = useTheme()
  const progress = useRef(new Animated.Value(0)).current
  const styles = createStyles(colors)
  useEffect(() => {
    if (!visible) { progress.setValue(0); return }
    Animated.timing(progress, { duration: motion.duration, toValue: 1, useNativeDriver: true }).start()
  }, [motion.duration, progress, visible])
  return <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}><View accessibilityViewIsModal style={styles.overlay}><Pressable accessibilityLabel="Fechar painel" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} /><Animated.View style={[styles.sheet, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.translate ? 28 : 0, 0] }) }] }]}><View style={styles.handle} /><Text accessibilityRole="header" style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}<View style={styles.content}>{children}</View></Animated.View></View></Modal>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { backgroundColor: colors.overlay, flex: 1, justifyContent: 'flex-end' },
  sheet: { ...shared.shadow.elevated, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.xl, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, maxHeight: '86%', paddingBottom: shared.spacing.xxxl, paddingHorizontal: shared.spacing.lg, paddingTop: shared.spacing.sm },
  handle: { alignSelf: 'center', backgroundColor: colors.surfaceTertiary, borderRadius: 999, height: 5, marginBottom: shared.spacing.lg, width: 42 },
  title: { ...typography.titleSmall, color: colors.textPrimary, fontWeight: '800' },
  description: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.xs },
  content: { marginTop: shared.spacing.lg },
})

import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function SettingsRow({ title, description, icon, trailing, onPress, disabled, destructive }: { title: string; description?: string; icon?: ReactNode; trailing?: ReactNode; onPress?: () => void; disabled?: boolean; destructive?: boolean }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ disabled }} disabled={!onPress || disabled} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>{icon && <View style={styles.icon}>{icon}</View>}<View style={styles.copy}><Text style={[styles.title, destructive && { color: colors.danger }]}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{trailing}</Pressable>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: shared.spacing.md, minHeight: 64, paddingHorizontal: shared.spacing.lg, paddingVertical: shared.spacing.sm }, icon: { alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: 12, height: 40, justifyContent: 'center', width: 40 }, copy: { flex: 1 }, title: { ...typography.label, color: colors.textPrimary, fontWeight: '700' }, description: { ...typography.caption, color: colors.textSecondary, marginTop: 2 }, pressed: { backgroundColor: colors.surfaceSecondary }, disabled: { opacity: 0.5 } })

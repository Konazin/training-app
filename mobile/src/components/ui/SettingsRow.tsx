import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function SettingsRow({ title, description, icon, trailing, onPress, disabled, destructive }: { title: string; description?: string; icon?: ReactNode; trailing?: ReactNode; onPress?: () => void; disabled?: boolean; destructive?: boolean }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ disabled }} disabled={!onPress || disabled} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>{icon && <View style={styles.icon}>{icon}</View>}<View style={styles.copy}><Text style={[styles.title, destructive && { color: colors.danger }]}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{trailing}</Pressable>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ row: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: shared.spacing.md, minHeight: 56, paddingVertical: shared.spacing.sm }, icon: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 }, copy: { flex: 1 }, title: { ...typography.label, color: colors.tx, fontWeight: '400' }, description: { ...typography.caption, color: colors.t2, marginTop: 2 }, pressed: { backgroundColor: colors.s2 }, disabled: { opacity: 0.5 } })

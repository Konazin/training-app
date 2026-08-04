import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function EmptyState({ title, description, icon, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.container}>{icon && <View style={styles.icon}>{icon}</View>}<Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{action && <View style={styles.action}>{action}</View>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ container: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.lg, borderWidth: 1, padding: shared.spacing.xxl }, icon: { alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: shared.radii.md, height: 56, justifyContent: 'center', marginBottom: shared.spacing.md, width: 56 }, title: { ...typography.titleSmall, color: colors.textPrimary, fontWeight: '800', textAlign: 'center' }, description: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.sm, maxWidth: 300, textAlign: 'center' }, action: { alignSelf: 'stretch', marginTop: shared.spacing.lg } })

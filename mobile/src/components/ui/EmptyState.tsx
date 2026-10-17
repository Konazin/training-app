import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function EmptyState({ title, description, icon, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.container}>{icon && <View style={styles.icon}>{icon}</View>}<Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{action && <View style={styles.action}>{action}</View>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ container: { alignItems: 'flex-start', paddingVertical: shared.spacing.lg }, icon: { alignItems: 'center', height: 40, justifyContent: 'center', marginBottom: shared.spacing.md, width: 40 }, title: { ...typography.title, color: colors.tx }, description: { ...typography.bodySmall, color: colors.t2, marginTop: shared.spacing.sm, maxWidth: 300 }, action: { alignSelf: 'stretch', marginTop: shared.spacing.lg } })

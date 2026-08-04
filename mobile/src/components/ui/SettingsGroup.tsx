import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.group}><Text style={styles.title}>{title}</Text>{children}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ group: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.md, borderWidth: 1, marginBottom: shared.spacing.md, overflow: 'hidden' }, title: { ...typography.caption, color: colors.textSecondary, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: shared.spacing.lg, paddingBottom: shared.spacing.xs, paddingTop: shared.spacing.md, textTransform: 'uppercase' } })

import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.group}><Text style={styles.title}>{title}</Text>{children}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ group: { marginBottom: shared.spacing.lg }, title: { ...typography.caption, color: colors.t2, marginBottom: shared.spacing.xs } })

import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function MetricCard({ label, value, detail, icon }: { label: string; value: string | number; detail?: string; icon?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`} style={styles.card}>{icon}<Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text>{detail && <Text style={styles.detail}>{detail}</Text>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.sm, borderWidth: 1, flex: 1, minWidth: shared.responsive.metricMinWidth, padding: shared.spacing.md }, value: { ...typography.titleSmall, color: colors.textPrimary, fontWeight: '800', marginTop: shared.spacing.xs }, label: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }, detail: { ...typography.caption, color: colors.textSecondary, marginTop: shared.spacing.xs } })

import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function MetricCard({ label, value, detail, icon }: { label: string; value: string | number; detail?: string; icon?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`} style={styles.card}>{icon}<Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text>{detail && <Text style={styles.detail}>{detail}</Text>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ card: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flex: 1, minWidth: shared.responsive.metricMinWidth, paddingVertical: shared.spacing.md }, value: { ...typography.numberLarge, color: colors.tx, marginTop: shared.spacing.xs }, label: { ...typography.caption, color: colors.t2 }, detail: { ...typography.caption, color: colors.t2, marginTop: shared.spacing.xs } })

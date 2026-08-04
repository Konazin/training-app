import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function SectionHeader({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.container}><View style={styles.copy}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{meta && <Text style={styles.meta}>{meta}</Text>}</View>{action}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.md, justifyContent: 'space-between', marginBottom: shared.spacing.sm, marginTop: shared.spacing.lg, minHeight: shared.touchTarget.minimum },
  copy: { flex: 1 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '800' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
})

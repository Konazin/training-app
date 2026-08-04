import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function HeroCard({ eyebrow, title, description, children, trailing, style }: { eyebrow?: string; title: string; description?: string; children?: ReactNode; trailing?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={[styles.card, style]}><View style={styles.row}><View style={styles.copy}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{trailing}</View>{children && <View style={styles.content}>{children}</View>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { ...shared.shadow.subtle, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: shared.radii.lg, borderWidth: 1, padding: shared.spacing.lg },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: shared.spacing.md },
  copy: { flex: 1 },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { ...typography.titleSmall, color: colors.textPrimary, fontWeight: '800', marginTop: shared.spacing.xs },
  description: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.sm },
  content: { marginTop: shared.spacing.lg },
})

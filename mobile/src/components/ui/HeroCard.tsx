import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function HeroCard({ title, description, children, trailing, style }: { eyebrow?: string; title: string; description?: string; children?: ReactNode; trailing?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={[styles.card, style]}><View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{trailing}</View>{children && <View style={styles.content}>{children}</View>}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.s1, borderRadius: shared.radii.lg, padding: shared.spacing.xl },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: shared.spacing.md },
  copy: { flex: 1 },
  title: { ...typography.title, color: colors.tx },
  description: { ...typography.bodySmall, color: colors.t2, marginTop: shared.spacing.sm },
  content: { marginTop: shared.spacing.lg },
})

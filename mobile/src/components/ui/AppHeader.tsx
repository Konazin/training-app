import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function AppHeader({ eyebrow, title, subtitle, leading, action }: {
  eyebrow?: string
  title: string
  subtitle?: string
  leading?: { label: string; icon: ReactNode; onPress: () => void }
  action?: ReactNode
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.container}>
    {leading && <Pressable accessibilityLabel={leading.label} accessibilityRole="button" hitSlop={4} onPress={leading.onPress} style={styles.iconButton}>{leading.icon}</Pressable>}
    <View style={styles.copy}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.md, marginBottom: shared.spacing.xl, minHeight: shared.touchTarget.minimum },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.xs },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: shared.radii.sm, borderWidth: 1, height: shared.touchTarget.minimum, justifyContent: 'center', width: shared.touchTarget.minimum },
})

import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export function AppHeader({ title, subtitle, leading, action }: {
  /** Ignorado; mantido para chamadas antigas. */
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
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.md, marginBottom: shared.spacing.xl, minHeight: shared.touchTarget.minimum },
  copy: { flex: 1, minWidth: 0 },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: shared.spacing.xs },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: shared.radii.md, height: shared.touchTarget.minimum, justifyContent: 'center', width: shared.touchTarget.minimum },
})

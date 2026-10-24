import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Reveal } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

/** Estado vazio centrado: um ícone discreto, uma frase que diz o que falta e uma ação. */
export function EmptyState({ title, description, icon, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Reveal style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && <View style={styles.action}>{action}</View>}
    </Reveal>
  )
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: shared.spacing.lg, paddingVertical: shared.spacing.xxl },
  icon: { alignItems: 'center', backgroundColor: colors.s1, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: shared.spacing.lg, width: 56 },
  title: { ...typography.titleSmall, color: colors.tx, textAlign: 'center' },
  description: { ...typography.bodySmall, color: colors.t2, marginTop: shared.spacing.sm, maxWidth: 300, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: shared.spacing.xl },
})

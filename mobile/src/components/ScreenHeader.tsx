import { StyleSheet, Text, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

interface Props {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
  variant?: 'hero' | 'standard' | 'compact'
}

export function ScreenHeader({ eyebrow, title, description, action, variant = 'standard' }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={[styles.container, variant === 'compact' && styles.compact, variant === 'hero' && styles.hero]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, variant === 'compact' && styles.compactEyebrow]}>{eyebrow}</Text>
        <Text style={[styles.title, variant === 'compact' && styles.compactTitle, variant === 'hero' && styles.heroTitle]}>{title}</Text>
        {!!description && <Text style={styles.description}>{description}</Text>}
      </View>
      {action}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  compact: { marginBottom: 18 },
  hero: { marginBottom: 32 },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 39,
    flexShrink: 1,
  },
  compactEyebrow: { marginBottom: 3 },
  compactTitle: { fontSize: 30, lineHeight: 36 },
  heroTitle: { fontSize: 38, lineHeight: 45 },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 310,
  },
})

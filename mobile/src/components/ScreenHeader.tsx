import { StyleSheet, Text, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

interface Props {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function ScreenHeader({ eyebrow, title, description, action }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
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
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 39,
    flexShrink: 1,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 310,
  },
})

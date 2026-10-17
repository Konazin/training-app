import { StyleSheet, Text, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

interface Props {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
  titleVariant?: 'display' | 'large'
}

export function ScreenHeader({ eyebrow, title, description, action, titleVariant = 'large' }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={[styles.title, titleVariant === 'display' && styles.display]}>{title}</Text>
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
    ...typography.monoLabel,
    color: colors.t2,
    marginBottom: 8,
  },
  title: {
    ...typography.titleLarge,
    color: colors.tx,
    flexShrink: 1,
  },
  display: typography.display,
  description: {
    ...typography.bodySmall,
    color: colors.t2,
    marginTop: 9,
    maxWidth: 310,
  },
})

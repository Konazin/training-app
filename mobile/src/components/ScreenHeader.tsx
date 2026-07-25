import { StyleSheet, Text, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'

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
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.gray400,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 35,
  },
  description: {
    color: colors.gray500,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
    maxWidth: 310,
  },
})

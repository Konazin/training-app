import { useContext } from 'react'
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native'
import { ArrowLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

const ROOT_ROUTES = new Set(['MainTabs', 'Today', 'Plan', 'History', 'Nutrition', 'More', 'Session'])

interface Props {
  /** Ignorado: o título carrega a hierarquia sozinho. Mantido para não quebrar chamadas antigas. */
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  titleVariant?: 'display' | 'large'
}

export function ScreenHeader({ title, description, action, titleVariant = 'large' }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const navigation = useContext(NavigationContext)
  const route = useContext(NavigationRouteContext)
  // Telas empilhadas ganham um voltar visível; as abas principais e a sessão têm navegação própria.
  const showBack = Boolean(navigation && route && !ROOT_ROUTES.has(route.name) && navigation.canGoBack())
  return (
    <View>
      {showBack && (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => navigation?.goBack()}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <ArrowLeft color={colors.tx} size={22} strokeWidth={1.8} />
        </Pressable>
      )}
      <View style={styles.container}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, titleVariant === 'display' && styles.display]}>{title}</Text>
        {!!description && <Text style={styles.description}>{description}</Text>}
      </View>
      {action}
      </View>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  back: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: 4, marginLeft: -12, width: 48 },
  backPressed: { backgroundColor: colors.s2 },
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
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
    marginTop: 8,
    maxWidth: 320,
  },
})

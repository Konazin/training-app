import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, type ThemeColors, useTheme } from '../../theme'

export function BottomActionBar({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets()
  const { colors } = useTheme()
  return <View style={[createStyles(colors).bar, { paddingBottom: Math.max(bottom, shared.spacing.md) }]}>{children}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ bar: { ...shared.shadow.elevated, backgroundColor: colors.tabBar, borderColor: colors.border, borderTopLeftRadius: shared.radii.lg, borderTopRightRadius: shared.radii.lg, borderWidth: 1, bottom: 0, gap: shared.spacing.sm, left: 0, paddingHorizontal: shared.spacing.lg, paddingTop: shared.spacing.md, position: 'absolute', right: 0 } })

import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, type ThemeColors, useTheme } from '../../theme'

export function BottomActionBar({ children, highContrast = false }: { children: ReactNode; highContrast?: boolean }) {
  const { bottom } = useSafeAreaInsets()
  const { colors } = useTheme()
  return <View style={[createStyles(colors, highContrast).bar, { paddingBottom: Math.max(bottom, shared.spacing.md) }]}>{children}</View>
}
const createStyles = (colors: ThemeColors, highContrast: boolean) => StyleSheet.create({
  bar: {
    backgroundColor: highContrast ? colors.workout.background : colors.bg,
    borderTopColor: highContrast ? colors.workout.border : colors.bd,
    borderTopWidth: 1,
    bottom: 0,
    gap: shared.spacing.sm,
    left: 0,
    paddingHorizontal: shared.pagePadding,
    paddingTop: shared.spacing.md,
    position: 'absolute',
    right: 0,
  },
})

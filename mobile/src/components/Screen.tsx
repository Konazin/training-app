import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { shared, useTheme } from '../theme'
import { screenPadding } from '../theme/uiContracts'

export function getScreenPadding(top: number, bottom: number, includeBottomInset: boolean) {
  return screenPadding(top, bottom, includeBottomInset)
}

interface ScreenProps extends ViewProps {
  children: ReactNode
  includeBottomInset?: boolean
  keyboard?: boolean
}

export function Screen({
  children,
  includeBottomInset = true,
  keyboard = false,
  style,
  ...props
}: ScreenProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const padding = getScreenPadding(insets.top, insets.bottom, includeBottomInset)
  const content = (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingTop: padding.paddingTop },
        includeBottomInset && { paddingBottom: padding.paddingBottom },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
  if (!keyboard) return content
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {content}
    </KeyboardAvoidingView>
  )
}

interface ScreenScrollViewProps extends ScrollViewProps {
  children: ReactNode
  includeBottomInset?: boolean
  horizontalPadding?: boolean
}

export function ScreenScrollView({
  children,
  contentContainerStyle,
  includeBottomInset = true,
  horizontalPadding = true,
  ...props
}: ScreenScrollViewProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const automaticInsets = Platform.OS === 'ios'
  const padding = getScreenPadding(
    automaticInsets ? 0 : insets.top,
    automaticInsets ? 0 : insets.bottom,
    includeBottomInset,
  )
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            backgroundColor: colors.background,
            paddingBottom: padding.paddingBottom,
            paddingHorizontal: horizontalPadding ? shared.screen.horizontalPadding : 0,
            paddingTop: padding.paddingTop,
          },
          contentContainerStyle,
        ]}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
})

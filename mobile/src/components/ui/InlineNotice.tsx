import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import type { StatusTone } from './StatusPill'

export function InlineNotice({ title, message, tone = 'neutral', action, icon }: { title?: string; message: string; tone?: StatusTone; action?: ReactNode; icon?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors, tone)
  return <View accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'} style={styles.notice}>{icon}<View style={styles.copy}>{title && <Text style={styles.title}>{title}</Text>}<Text style={styles.message}>{message}</Text>{action && <View style={styles.action}>{action}</View>}</View></View>
}
const createStyles = (colors: ThemeColors, tone: StatusTone) => {
  const accent = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'primary' ? colors.primary : colors.border
  return StyleSheet.create({ notice: { alignItems: 'flex-start', backgroundColor: colors.surfaceSecondary, borderColor: accent, borderLeftWidth: 4, borderRadius: shared.radii.sm, flexDirection: 'row', gap: shared.spacing.md, padding: shared.spacing.md }, copy: { flex: 1 }, title: { ...typography.label, color: colors.textPrimary, fontWeight: '800' }, message: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 }, action: { alignSelf: 'flex-start', marginTop: shared.spacing.sm } })
}

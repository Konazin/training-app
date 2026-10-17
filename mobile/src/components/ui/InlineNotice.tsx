import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import type { StatusTone } from './StatusPill'

export function InlineNotice({ title, message, tone = 'neutral', action, icon }: { title?: string; message: string; tone?: StatusTone; action?: ReactNode; icon?: ReactNode }) {
  const { colors } = useTheme()
  const styles = createStyles(colors, tone)
  const Mark = tone === 'success' ? CircleCheck : tone === 'danger' || tone === 'warning' ? CircleAlert : Info
  const markColor = tone === 'danger' ? colors.dg : colors.tx
  return <View accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'} style={styles.notice}>{icon ?? <View accessibilityElementsHidden><Mark color={markColor} size={18} strokeWidth={1.6} /></View>}<View style={styles.copy}>{title && <Text style={styles.title}>{title}</Text>}<Text style={styles.message}>{message}</Text>{action && <View style={styles.action}>{action}</View>}</View></View>
}
const createStyles = (colors: ThemeColors, tone: StatusTone) => {
  const accent = tone === 'danger' ? colors.dg : colors.tx
  return StyleSheet.create({ notice: { alignItems: 'flex-start', backgroundColor: colors.s1, borderColor: colors.bd, borderLeftColor: accent, borderLeftWidth: 2, borderRadius: shared.radii.sm, flexDirection: 'row', gap: shared.spacing.md, padding: shared.spacing.md }, copy: { flex: 1 }, title: { ...typography.label, color: colors.tx, fontWeight: '500' }, message: { ...typography.bodySmall, color: colors.t2, marginTop: 2 }, action: { alignSelf: 'flex-start', marginTop: shared.spacing.sm } })
}

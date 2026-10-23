import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { colors } = useTheme()
  const toneColors = resolveTone(colors, tone)
  return <View style={[styles.pill, { backgroundColor: toneColors.background, borderColor: toneColors.border }]}><Text style={[styles.label, { color: toneColors.foreground }]}>{label}</Text></View>
}
function resolveTone(colors: ThemeColors, tone: StatusTone) {
  if (tone === 'danger') return { foreground: colors.dg, background: 'transparent', border: colors.dg }
  if (tone === 'primary') return { foreground: colors.on, background: colors.ac, border: colors.ac }
  if (tone === 'success') return { foreground: colors.tx, background: colors.s2, border: colors.s2 }
  return { foreground: colors.t2, background: 'transparent', border: colors.bd }
}
const styles = StyleSheet.create({ pill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 26, paddingHorizontal: shared.spacing.md }, label: { ...typography.captionSmall, fontWeight: '500' } })

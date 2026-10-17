import { StyleSheet, Text, View } from 'react-native'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { colors } = useTheme()
  const toneColors = resolveTone(colors, tone)
  return <View style={[styles.pill, { backgroundColor: toneColors.background, borderColor: toneColors.foreground }]}><Text style={[styles.label, { color: toneColors.foreground }]}>{label}</Text></View>
}
function resolveTone(colors: ThemeColors, tone: StatusTone) {
  if (tone === 'danger') return { foreground: colors.dg, background: colors.s1 }
  if (tone === 'primary') return { foreground: colors.tx, background: colors.s1 }
  return { foreground: colors.t2, background: 'transparent' }
}
const styles = StyleSheet.create({ pill: { alignSelf: 'flex-start', borderRadius: shared.radii.sm, borderWidth: 0, minHeight: 28, justifyContent: 'center', paddingHorizontal: shared.spacing.sm }, label: { ...typography.captionSmall } })

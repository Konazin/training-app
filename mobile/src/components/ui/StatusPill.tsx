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
  if (tone === 'primary') return { foreground: colors.primary, background: colors.surfaceSecondary }
  if (tone === 'success') return { foreground: colors.success, background: colors.successSurface }
  if (tone === 'warning') return { foreground: colors.warning, background: colors.surfaceSecondary }
  if (tone === 'danger') return { foreground: colors.danger, background: colors.dangerSurface }
  return { foreground: colors.textSecondary, background: colors.surface }
}
const styles = StyleSheet.create({ pill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: shared.spacing.md }, label: { ...typography.caption, fontWeight: '800' } })

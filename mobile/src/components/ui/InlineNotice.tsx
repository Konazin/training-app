import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native'
import { Reveal } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { feedbackColors } from '../../theme/uiContracts'
import type { StatusTone } from './StatusPill'

/** Aviso em linha. O tom vem do ícone e do texto; só o erro usa o vermelho dessaturado. */
export function InlineNotice({ title, message, tone = 'neutral', action, icon }: { title?: string; message: string; tone?: StatusTone; action?: ReactNode; icon?: ReactNode }) {
  const { colors } = useTheme()
  const kind = tone === 'danger' ? 'error' : tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'info'
  const palette = feedbackColors(colors, kind)
  const styles = createStyles(colors, palette)
  const Mark = tone === 'success' ? CircleCheck : tone === 'danger' || tone === 'warning' ? CircleAlert : Info
  return (
    <Reveal>
      <View accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'} style={styles.notice}>
        {icon ?? <View accessibilityElementsHidden><Mark color={tone === 'danger' ? colors.dg : colors.tx} size={18} strokeWidth={1.8} /></View>}
        <View style={styles.copy}>
          {title && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message}>{message}</Text>
          {action && <View style={styles.action}>{action}</View>}
        </View>
      </View>
    </Reveal>
  )
}
const createStyles = (colors: ThemeColors, palette: ReturnType<typeof feedbackColors>) => StyleSheet.create({
  notice: { alignItems: 'flex-start', backgroundColor: palette.background, borderColor: palette.border, borderRadius: shared.radii.md, borderWidth: 1, flexDirection: 'row', gap: shared.spacing.md, marginVertical: shared.spacing.xs, padding: shared.spacing.lg },
  copy: { flex: 1 },
  title: { ...typography.label, color: colors.tx, fontWeight: '500' },
  message: { ...typography.bodySmall, color: palette.text === colors.dg ? colors.dg : colors.t2, marginTop: 2 },
  action: { alignSelf: 'flex-start', marginTop: shared.spacing.sm },
})

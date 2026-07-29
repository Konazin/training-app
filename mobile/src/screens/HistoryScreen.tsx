import { StyleSheet, Text, View } from 'react-native'
import type { WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

export function HistoryScreen({ sessions }: { sessions: WorkoutSession[] }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const completed = sessions.filter((item) => item.status === 'COMPLETED')
  const volume = completed.reduce((sum, item) => sum + item.totalVolume, 0)
  return (
    <ScreenScrollView includeBottomInset={false}>
      <ScreenHeader eyebrow="Evolução real" title={'Histórico e\nprogresso'} description="Métricas calculadas sobre séries persistidas." />
      <View style={styles.metrics}>
        <Metric label="SESSÕES" value={completed.length} styles={styles} />
        <Metric label="VOLUME" value={`${volume}kg`} styles={styles} />
      </View>
      {!sessions.length ? (
        <View style={styles.empty}>
          <Text style={styles.title}>Nenhuma sessão registrada</Text>
          <Text style={styles.meta}>Inicie um treino pela ficha ativa.</Text>
        </View>
      ) : sessions.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={[styles.status, item.status === 'COMPLETED' && styles.complete]}>
            <Text style={styles.statusText}>{item.status === 'COMPLETED' ? '✓' : '×'}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.workoutName}</Text>
            <Text style={styles.meta}>{item.scheduledDate.split('-').reverse().join('/')} · {item.completedSets} séries</Text>
          </View>
          <Text style={styles.volume}>{item.totalVolume}kg</Text>
        </View>
      ))}
    </ScreenScrollView>
  )
}

function Metric({ label, value, styles }: { label: string; value: string | number; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  metrics: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, padding: 16 },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' },
  value: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 28, marginTop: 6 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, minHeight: 72, padding: 12 },
  status: { alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  complete: { backgroundColor: colors.successSurface },
  statusText: { color: colors.success, fontSize: 18, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...typography.body, color: colors.textPrimary, flexShrink: 1, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  volume: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  empty: { alignItems: 'center', minHeight: 260, justifyContent: 'center' },
})

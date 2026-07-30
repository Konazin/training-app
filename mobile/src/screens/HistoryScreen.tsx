import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import type { HistoryProgress, WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

const statusLabels = {
  COMPLETED: 'Concluída',
  ABANDONED: 'Não concluída',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausada',
} as const

export function HistoryScreen({
  sessions,
  progress,
  loading,
  warning,
  onRefresh,
}: {
  sessions: WorkoutSession[]
  progress: HistoryProgress
  loading: boolean
  warning?: string
  onRefresh: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <ScreenScrollView
      includeBottomInset={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.ink} />}
    >
      <ScreenHeader
        eyebrow="Progresso local"
        title="Histórico e progresso"
        description="Resultados calculados a partir das sessões salvas neste aparelho."
      />
      {!!warning && <Text accessibilityRole="alert" style={styles.warning}>{warning}</Text>}
      <View style={styles.metrics}>
        <Metric label="SESSÕES" value={progress.completedSessions} />
        <Metric label="ESTA SEMANA" value={progress.completedThisWeek} />
        <Metric label="CONCLUSÃO" value={`${progress.completionRate}%`} />
        <Metric label="EXERCÍCIOS" value={progress.completedExercises} />
        <Metric label="MINUTOS" value={Math.round(progress.totalDurationSeconds / 60)} />
        <Metric label="VOLUME" value={`${Math.round(progress.totalVolume)} kg`} />
      </View>
      {!sessions.length ? (
        <View style={styles.empty}>
          <Text style={styles.title}>Nenhuma sessão registrada</Text>
          <Text style={styles.meta}>Seus treinos concluídos e não concluídos aparecerão aqui.</Text>
        </View>
      ) : sessions.map((session) => (
        <View
          accessibilityLabel={`${session.workoutName}, ${session.dayName}, ${statusLabels[session.status]}`}
          key={session.id}
          style={styles.card}
        >
          <Text style={[styles.status, session.status === 'COMPLETED' && styles.completed]}>
            {statusLabels[session.status]}
          </Text>
          <Text style={styles.title}>{session.workoutName}</Text>
          <Text style={styles.day}>{session.dayName}</Text>
          <Text style={styles.meta}>
            {formatDateKey(session.scheduledDate)} · {session.completedSets} séries
            {' · '}{formatDuration(session.totalDurationSeconds)}
            {session.totalVolume > 0 ? ` · ${Math.round(session.totalVolume)} kg` : ''}
          </Text>
        </View>
      ))}
    </ScreenScrollView>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

function formatDateKey(value: string) {
  return value.split('-').reverse().join('/')
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes} min ${remaining} s` : `${minutes} min`
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  warning: { ...typography.bodySmall, backgroundColor: colors.surfaceSecondary, borderRadius: 12, color: colors.warning, marginBottom: 12, padding: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, minWidth: '46%', padding: 15 },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' },
  value: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', lineHeight: 28, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 9, padding: 16 },
  status: { ...typography.caption, color: colors.warning, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase' },
  completed: { color: colors.success },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '800' },
  day: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginTop: 7 },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 240 },
})

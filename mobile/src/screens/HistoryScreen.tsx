import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { CircleCheck, CirclePause, CirclePlay, CircleX } from 'lucide-react-native'
import type { HistoryProgress, WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
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
  onOpenPlan,
}: {
  sessions: WorkoutSession[]
  progress: HistoryProgress
  loading: boolean
  warning?: string
  onRefresh: () => void
  onOpenPlan: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <ScreenScrollView
      includeBottomInset={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.tx} />}
    >
      <ScreenHeader
        eyebrow="treinos salvos neste aparelho"
        title="Progresso"
        description="Resultados calculados a partir das sessões concluídas."
      />
      {!!warning && (
        <View accessibilityRole="alert" style={styles.warning}>
          <Text style={styles.warningMark}>!</Text>
          <Text style={styles.warningText}>{warning}</Text>
          <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.warningAction}>
            <Text style={styles.warningActionText}>Tentar de novo</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.metrics}>
        <Metric label="sessões" value={progress.completedSessions} detail="concluídas no total" />
        <Metric label="esta semana" value={progress.completedThisWeek} detail="segunda a domingo" />
        <Metric label="conclusão" value={`${progress.completionRate}%`} detail="entre as sessões iniciadas" />
        <Metric label="exercícios" value={progress.completedExercises} detail="concluídos no total" />
        <Metric label="tempo" value={formatDuration(progress.totalDurationSeconds)} detail="somente sessões concluídas" />
        <Metric label="volume" value={`${Math.round(progress.totalVolume).toLocaleString('pt-BR')} kg`} detail="somente sessões concluídas" />
      </View>
      <Text style={styles.sectionTitle}>Sessões salvas</Text>
      {!sessions.length ? (
        <View style={styles.empty}>
          <Text accessibilityRole="header" style={styles.emptyTitle}>Nenhuma sessão salva</Text>
          <Text style={styles.emptyDescription}>Conclua um treino para começar a acompanhar o histórico neste aparelho.</Text>
          <PrimaryButton label="Abrir ficha" onPress={onOpenPlan} />
        </View>
      ) : sessions.map((session) => (
        <View
          accessibilityLabel={`${session.workoutName}, ${session.dayName}, ${statusLabels[session.status]}`}
          key={session.id}
          style={styles.session}
        >
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{session.workoutName}</Text>
            <Text style={styles.sessionDate}>{formatDateKey(session.scheduledDate)}</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusGlyph status={session.status} colors={colors} />
            <Text style={styles.status}>{statusLabels[session.status]}</Text>
            <Text style={styles.day}>{session.dayName}</Text>
          </View>
          <Text style={styles.meta}>
            {session.completedSets} séries
            {' · '}{formatDuration(session.totalDurationSeconds)}
            {session.totalVolume > 0 ? ` · ${Math.round(session.totalVolume).toLocaleString('pt-BR')} kg` : ''}
          </Text>
          {session.exercises.filter((exercise) => exercise.substituteName).map((exercise) => (
            <Text key={exercise.id} style={styles.substitution}>
              Planejado: {exercise.name} · Realizado: {exercise.substituteName}
            </Text>
          ))}
        </View>
      ))}
    </ScreenScrollView>
  )
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View accessibilityLabel={`${label}: ${value}. ${detail}`} style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.8} style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  )
}

function StatusGlyph({ status, colors }: { status: WorkoutSession['status']; colors: ThemeColors }) {
  const props = { color: colors.tx, size: 16, strokeWidth: 1.5 }
  if (status === 'COMPLETED') return <CircleCheck {...props} />
  if (status === 'ABANDONED') return <CircleX {...props} />
  if (status === 'PAUSED') return <CirclePause {...props} />
  return <CirclePlay {...props} />
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replaceAll('.', '')
    .toLocaleLowerCase('pt-BR')
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes} min ${remaining} s` : `${minutes} min`
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  warning: { alignItems: 'flex-start', backgroundColor: colors.s1, borderRadius: 12, flexDirection: 'row', gap: 10, marginBottom: 16, padding: 14 },
  warningMark: { ...typography.bodySmall, color: colors.tx, fontWeight: '600' },
  warningText: { ...typography.bodySmall, color: colors.tx, flex: 1 },
  warningAction: { justifyContent: 'center', minHeight: 48 },
  warningActionText: { ...typography.bodySmall, color: colors.tx, fontWeight: '600', textDecorationLine: 'underline', textDecorationColor: colors.tx },
  metrics: { columnGap: 16, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, rowGap: 0 },
  metric: { borderTopColor: colors.bd, borderTopWidth: 1, flexBasis: '47%', flexGrow: 1, minWidth: 128, paddingBottom: 16, paddingTop: 14 },
  label: { ...typography.monoLabel, color: colors.t2 },
  value: { ...typography.numberLarge, color: colors.tx, marginTop: 8 },
  detail: { ...typography.captionSmall, color: colors.t2, marginTop: 5 },
  sectionTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 4, marginTop: 8 },
  session: { borderBottomColor: colors.bd, borderBottomWidth: 1, paddingBottom: 16, paddingTop: 16 },
  sessionHeader: { alignItems: 'baseline', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  sessionTitle: { ...typography.body, color: colors.tx, flex: 1, fontWeight: '500' },
  sessionDate: { ...typography.numberSmall, color: colors.t2 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 7 },
  status: { ...typography.caption, color: colors.tx },
  day: { ...typography.caption, color: colors.t2 },
  meta: { ...typography.numberSmall, color: colors.t2, lineHeight: 20, marginTop: 7 },
  substitution: { ...typography.bodySmall, color: colors.t2, marginTop: 8 },
  empty: { alignItems: 'flex-start', paddingBottom: 24, paddingTop: 16 },
  emptyTitle: { ...typography.titleSmall, color: colors.tx },
  emptyDescription: { ...typography.bodySmall, color: colors.t2, marginTop: 6 },
})

import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { ChartNoAxesColumnIncreasing, CircleCheck, CirclePause, CirclePlay, CircleX } from 'lucide-react-native'
import type { HistoryProgress, WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import { EmptyState, InlineNotice } from '../components/ui'
import { AnimatedNumber, Reveal } from '../motion'
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
  onRepeat,
}: {
  sessions: WorkoutSession[]
  progress: HistoryProgress
  loading: boolean
  warning?: string
  onRefresh: () => void
  onOpenPlan: () => void
  onRepeat?: (planId: number, dayId: number) => Promise<boolean>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <ScreenScrollView
      includeBottomInset={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.tx} />}
    >
      <Reveal>
        <ScreenHeader
          title="Progresso"
          description="Calculado a partir das sessões salvas neste aparelho."
        />
      </Reveal>
      {!!warning && (
        <InlineNotice
          action={<PrimaryButton label="Tentar de novo" onPress={onRefresh} secondary />}
          message={warning}
          tone="warning"
        />
      )}
      <Reveal index={1}>
        <View style={styles.metrics}>
          <Metric label="Sessões" value={progress.completedSessions} detail="concluídas no total" />
          <Metric label="Esta semana" value={progress.completedThisWeek} detail="segunda a domingo" />
          <Metric label="Conclusão" value={progress.completionRate} suffix="%" detail="entre as sessões iniciadas" />
          <Metric label="Exercícios" value={progress.completedExercises} detail="concluídos no total" />
          <Metric label="Tempo" value={formatDuration(progress.totalDurationSeconds)} detail="somente sessões concluídas" />
          <Metric label="Volume" value={Math.round(progress.totalVolume)} suffix=" kg" detail="somente sessões concluídas" />
        </View>
      </Reveal>
      <Text style={styles.sectionTitle}>Sessões salvas</Text>
      {!sessions.length ? (
        <EmptyState
          action={<PrimaryButton label="Abrir ficha" onPress={onOpenPlan} />}
          description="Conclua um treino para começar a acompanhar o histórico neste aparelho."
          icon={<ChartNoAxesColumnIncreasing color={colors.tx} size={24} strokeWidth={1.5} />}
          title="Nenhuma sessão salva"
        />
      ) : sessions.map((session, index) => (
        <Reveal index={index + 2} key={session.id}>
        <View
          accessibilityLabel={`${session.workoutName}, ${session.dayName}, ${statusLabels[session.status]}`}
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
          {!!onRepeat && session.status === 'COMPLETED' && (
            <View style={styles.repeat}>
              <PrimaryButton
                label="Repetir este treino"
                onPress={() => void onRepeat(session.trainingPlanId, session.planDayId)}
                secondary
              />
            </View>
          )}
        </View>
        </Reveal>
      ))}
    </ScreenScrollView>
  )
}

function Metric({ label, value, suffix = '', detail }: { label: string; value: string | number; suffix?: string; detail: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const shown = typeof value === 'number' ? `${value.toLocaleString('pt-BR')}${suffix}` : value
  return (
    <View accessibilityLabel={`${label}: ${shown}. ${detail}`} style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'number'
        ? <AnimatedNumber adjustsFontSizeToFit format={(current) => `${current.toLocaleString('pt-BR')}${suffix}`} minimumFontScale={0.8} style={styles.value} value={value} />
        : <Text adjustsFontSizeToFit minimumFontScale={0.8} style={styles.value}>{value}</Text>}
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
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
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
  metrics: { columnGap: 12, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, rowGap: 12 },
  metric: { backgroundColor: colors.s1, borderRadius: 20, flexBasis: '47%', flexGrow: 1, minWidth: 128, padding: 16 },
  label: { ...typography.caption, color: colors.t2 },
  value: { ...typography.numberLarge, color: colors.tx, marginTop: 8 },
  detail: { ...typography.captionSmall, color: colors.t2, marginTop: 5 },
  sectionTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 4, marginTop: 8 },
  session: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16, paddingTop: 16 },
  sessionHeader: { alignItems: 'baseline', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  sessionTitle: { ...typography.body, color: colors.tx, flex: 1, fontWeight: '500' },
  sessionDate: { ...typography.numberSmall, color: colors.t2 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 7 },
  status: { ...typography.caption, color: colors.tx },
  day: { ...typography.caption, color: colors.t2 },
  meta: { ...typography.numberSmall, color: colors.t2, lineHeight: 20, marginTop: 7 },
  repeat: { alignItems: 'flex-start', marginTop: 12 },
  substitution: { ...typography.bodySmall, color: colors.t2, marginTop: 8 },
})

import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { ChevronRight, ClipboardList } from 'lucide-react-native'
import {
  buildWeeklyTrainingOverview,
  findLatestExerciseLoadReferences,
  type TrainingPlan,
  type WorkoutSession,
} from '@training/training-domain'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { EmptyState, InlineNotice } from '../components/ui'
import { SettingsRow } from '../components/ui/SettingsRow'
import { AnimatedNumber, ProgressBar, Reveal } from '../motion'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'
import { TodayWorkoutCard } from './TodayWorkoutCard'
import { TrainingWeekSummary } from './TrainingWeekSummary'

export function HomeScreen({
  plans,
  sessions,
  loading,
  activeSession,
  trashCount,
  warning,
  now = new Date(),
  onRefresh,
  onCreatePlan,
  onOpenPlans,
  onOpenPlanDay,
  onStartToday,
  onContinueSession,
  onOpenArchived,
  onOpenTrash,
  onOpenLibrary,
  onOpenIntegrations,
}: {
  plans: TrainingPlan[]
  sessions: WorkoutSession[]
  loading: boolean
  activeSession: WorkoutSession | null
  trashCount: number
  warning?: string
  now?: Date
  onRefresh: () => void
  onCreatePlan: () => void
  onOpenPlans: () => void
  onOpenPlanDay: (planId: number, dayId: number) => void
  onStartToday: (planId: number, planDayId: number) => void
  onContinueSession: () => void
  onOpenArchived: () => void
  onOpenTrash: () => void
  onOpenLibrary: () => void
  onOpenIntegrations: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const normalPlans = plans.filter((plan) => !plan.archived && plan.deletedAt === null)
  const activePlan = normalPlans.find((plan) => plan.active) ?? null
  const overview = activePlan
    ? buildWeeklyTrainingOverview(activePlan, sessions, activeSession, now)
    : null
  const todayDay = activePlan?.days.find((day) => day.id === overview?.today.planDayId)
  const references = activePlan && todayDay
    ? findLatestExerciseLoadReferences(activePlan.id, todayDay, sessions)
    : []
  const todaySession = overview?.today.sessionId
    ? [activeSession, ...sessions].find((session) => session?.id === overview.today.sessionId) ?? null
    : null

  return (
    <ScreenScrollView
      includeBottomInset={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.tx} />}
      showsVerticalScrollIndicator={false}
    >
      <Reveal>
        <ScreenHeader
          description={formatMivDate(now)}
          title={overview?.today.title ?? 'Hoje'}
          titleVariant="display"
        />
      </Reveal>
      {!!warning && (
        <InlineNotice
          action={<PrimaryButton label="Tentar de novo" onPress={onRefresh} secondary />}
          message={warning}
          tone="warning"
        />
      )}
      {!!activeSession && (
        <Reveal index={1} style={styles.block}>
          <View style={styles.activeSession}>
            <View style={styles.activeHeader}>
              <View style={[styles.statusDot, activeSession.status === 'PAUSED' && styles.statusDotPaused]} />
              <Text style={styles.activeStatus}>
                {activeSession.status === 'PAUSED' ? 'Sessão pausada' : 'Sessão em andamento'}
              </Text>
            </View>
            <Text style={styles.activeTitle}>{activeSession.workoutName} · {activeSession.dayName}</Text>
            <View style={styles.activeProgress}>
              <AnimatedNumber style={styles.activeBig} value={activeSession.completedSets} />
              <Text style={styles.activeTotal}> / {activeSession.totalPlannedSets} séries</Text>
            </View>
            <ProgressBar
              color={colors.ac}
              progress={activeSession.totalPlannedSets ? activeSession.completedSets / activeSession.totalPlannedSets : 0}
              trackColor={colors.s2}
            />
            <View style={styles.activeAction}>
              <PrimaryButton
                accessibilityLabel={`${activeSession.status === 'PAUSED' ? 'Retomar' : 'Continuar'} treino ${activeSession.workoutName}`}
                label={activeSession.status === 'PAUSED' ? 'Retomar treino' : 'Continuar treino'}
                onPress={onContinueSession}
              />
            </View>
          </View>
        </Reveal>
      )}
      {!normalPlans.length ? (
        <EmptyState
          action={(
            <View style={styles.emptyActions}>
              <PrimaryButton label="Criar ficha" onPress={onCreatePlan} />
              <PrimaryButton label="Ver modelos" onPress={onOpenPlans} secondary />
            </View>
          )}
          description="Suas fichas ficam neste aparelho. Crie uma para organizar a semana de treino."
          icon={<ClipboardList color={colors.tx} size={24} strokeWidth={1.5} />}
          title="Nenhuma ficha ainda"
        />
      ) : !activePlan ? (
        <EmptyState
          action={<PrimaryButton label="Abrir fichas" onPress={onOpenPlans} />}
          description="Você tem fichas salvas, mas nenhuma está ativa nesta semana."
          icon={<ClipboardList color={colors.tx} size={24} strokeWidth={1.5} />}
          title="Escolha uma ficha para hoje"
        />
      ) : overview ? (
        <>
          {!activeSession && (
            <Reveal index={1} style={styles.block}>
              <TodayWorkoutCard
                plan={activePlan}
                day={overview.today}
                session={todaySession}
                references={references}
                blockedByCurrentSession={activeSession !== null}
                onStart={() => overview.today.planDayId
                  && onStartToday(activePlan.id, overview.today.planDayId)}
                onConfigure={() => overview.today.planDayId
                  && onOpenPlanDay(activePlan.id, overview.today.planDayId)}
                onContinue={onContinueSession}
                onOpenPlan={onOpenPlans}
              />
            </Reveal>
          )}
          <Reveal index={2} style={styles.block}>
            <TrainingWeekSummary overview={overview} />
          </Reveal>
          <Reveal index={3}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Atalhos</Text>
            <Shortcut label="Ficha ativa" onPress={onOpenPlans} />
            <Shortcut label="Fichas arquivadas" onPress={onOpenArchived} />
            <Shortcut label="Lixeira" badge={trashCount} onPress={onOpenTrash} />
            <Shortcut label="Biblioteca" onPress={onOpenLibrary} />
            <Shortcut label="Integrações" onPress={onOpenIntegrations} />
          </Reveal>
        </>
      ) : null}
    </ScreenScrollView>
  )
}

function Shortcut({
  label,
  badge,
  onPress,
}: {
  label: string
  badge?: number
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <SettingsRow
      onPress={onPress}
      title={badge ? `${label}, ${badge} ${badge === 1 ? 'item' : 'itens'}` : label}
      trailing={(
        <View style={styles.shortcutTrailing}>
          {!!badge && <Text accessibilityElementsHidden style={styles.badge}>{badge > 99 ? '99+' : badge}</Text>}
          <ChevronRight color={colors.mu} size={18} strokeWidth={1.6} />
        </View>
      )}
    />
  )
}

function formatMivDate(now: Date) {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(now)
    .toLocaleLowerCase('pt-BR')
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
    .format(now)
    .toLocaleLowerCase('pt-BR')
  return `${weekday}, ${now.getDate()} de ${month}`
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  block: { marginBottom: shared.spacing.xl },
  activeSession: { backgroundColor: colors.s1, borderRadius: shared.radii.lg, padding: shared.spacing.xl },
  activeHeader: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.sm },
  statusDot: { backgroundColor: colors.ac, borderRadius: 4, height: 8, width: 8 },
  statusDotPaused: { backgroundColor: 'transparent', borderColor: colors.t2, borderWidth: 1.5 },
  activeStatus: { ...typography.caption, color: colors.t2 },
  activeTitle: { ...typography.title, color: colors.tx, marginTop: shared.spacing.md },
  activeProgress: { alignItems: 'baseline', flexDirection: 'row', marginBottom: shared.spacing.md, marginTop: shared.spacing.lg },
  activeBig: { ...typography.numberLarge, color: colors.tx },
  activeTotal: { ...typography.bodySmall, color: colors.t2 },
  activeAction: { marginTop: shared.spacing.xl },
  emptyActions: { gap: shared.spacing.sm },
  sectionTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: shared.spacing.xs, marginTop: shared.spacing.sm },
  shortcutTrailing: { alignItems: 'center', flexDirection: 'row', gap: shared.spacing.sm },
  badge: { ...typography.captionSmall, backgroundColor: colors.s2, borderRadius: 11, color: colors.tx, minWidth: 22, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, textAlign: 'center' },
})

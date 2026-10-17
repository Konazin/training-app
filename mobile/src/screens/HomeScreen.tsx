import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ArrowRight, CircleAlert, CirclePause, CirclePlay, ChevronRight } from 'lucide-react-native'
import {
  buildWeeklyTrainingOverview,
  findLatestExerciseLoadReferences,
  type TrainingPlan,
  type WorkoutSession,
} from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { type ThemeColors, useTheme } from '../theme'
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.ink} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow={formatMivDate(now)}
        title={overview?.today.title ?? 'Hoje'}
        titleVariant="display"
      />
      {!!warning && (
        <View accessibilityRole="alert" style={styles.warning}>
          <CircleAlert color={colors.tx} size={18} strokeWidth={1.5} />
          <Text style={styles.warningText}>{warning}</Text>
          <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.warningAction}>
            <Text style={styles.warningActionText}>Tentar de novo</Text>
          </Pressable>
        </View>
      )}
      {!!activeSession && (
        <View style={styles.activeSession}>
          <View style={styles.activeHeader}>
            {activeSession.status === 'PAUSED'
              ? <CirclePause color={colors.t2} size={18} strokeWidth={1.5} />
              : <CirclePlay color={colors.tx} size={18} strokeWidth={1.5} />}
            <Text style={styles.activeEyebrow}>
              {activeSession.status === 'PAUSED' ? 'pausada' : 'em andamento'}
            </Text>
          </View>
          <Text style={styles.activeTitle}>{activeSession.workoutName} · {activeSession.dayName}</Text>
          <Text style={styles.activeProgress}>
            {activeSession.completedSets} / {activeSession.totalPlannedSets} séries
          </Text>
          <Pressable
            accessibilityLabel={`${activeSession.status === 'PAUSED' ? 'Retomar' : 'Continuar'} treino ${activeSession.workoutName}`}
            accessibilityRole="button"
            onPress={onContinueSession}
            style={({ pressed }) => [styles.activeAction, pressed && styles.primaryPressed]}
          >
            <Text style={styles.activeActionText}>
              {activeSession.status === 'PAUSED' ? 'Retomar treino' : 'Continuar treino'}
            </Text>
            <ArrowRight color={colors.on} size={18} strokeWidth={1.5} />
          </Pressable>
        </View>
      )}
      {!normalPlans.length ? (
        <EmptyPlan
          title="Nenhuma ficha ainda"
          description="Suas fichas ficam neste aparelho. Crie uma para organizar a semana de treino."
          action="Criar ficha"
          secondaryAction="Ver modelos"
          onPress={onCreatePlan}
          onSecondaryPress={onOpenPlans}
        />
      ) : !activePlan ? (
        <EmptyPlan
          title="Escolha uma ficha para hoje"
          description="Você tem fichas salvas, mas nenhuma está ativa nesta semana."
          action="Abrir fichas"
          onPress={onOpenPlans}
        />
      ) : overview ? (
        <>
          {!activeSession && (
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
          )}
          <TrainingWeekSummary overview={overview} />
          <Text style={styles.sectionTitle}>Atalhos</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.shortcuts}
            showsHorizontalScrollIndicator={false}
          >
            <Shortcut label="Ficha ativa" onPress={onOpenPlans} />
            <Shortcut label="Fichas arquivadas" onPress={onOpenArchived} />
            <Shortcut label="Lixeira" badge={trashCount} onPress={onOpenTrash} />
            <Shortcut label="Biblioteca" onPress={onOpenLibrary} />
            <Shortcut label="Integrações" onPress={onOpenIntegrations} />
          </ScrollView>
        </>
      ) : null}
    </ScreenScrollView>
  )
}

function EmptyPlan({
  title,
  description,
  action,
  secondaryAction,
  onPress,
  onSecondaryPress,
}: {
  title: string
  description: string
  action: string
  secondaryAction?: string
  onPress: () => void
  onSecondaryPress?: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.primary}>
        <Text style={styles.primaryText}>{action}</Text>
      </Pressable>
      {!!secondaryAction && !!onSecondaryPress && (
        <Pressable accessibilityRole="button" onPress={onSecondaryPress} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>{secondaryAction}</Text>
        </Pressable>
      )}
    </View>
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
    <Pressable
      accessibilityLabel={badge ? `${label}, ${badge} ${badge === 1 ? 'item' : 'itens'}` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
    >
      <Text style={styles.shortcutText}>{label}</Text>
      {!!badge && <Text accessibilityRole="text" style={styles.badge}>{badge > 99 ? '99+' : badge}</Text>}
      <ChevronRight color={colors.mu} size={16} strokeWidth={1.5} />
    </Pressable>
  )
}

function formatMivDate(now: Date) {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(now)
    .replaceAll('.', '')
    .toLocaleLowerCase('pt-BR')
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(now)
    .replaceAll('.', '')
    .toLocaleLowerCase('pt-BR')
  return `${weekday} · ${now.getDate()} ${month}`
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  warning: { alignItems: 'flex-start', backgroundColor: colors.s1, borderRadius: 12, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 14 },
  warningText: { ...typography.bodySmall, color: colors.tx, flex: 1 },
  warningAction: { justifyContent: 'center', minHeight: 48 },
  warningActionText: { ...typography.bodySmall, color: colors.tx, fontWeight: '600', textDecorationLine: 'underline', textDecorationColor: colors.tx },
  empty: { alignItems: 'flex-start', paddingBottom: 24, paddingTop: 8 },
  emptyTitle: { ...typography.titleLarge, color: colors.tx },
  emptyDescription: { ...typography.body, color: colors.t2, marginTop: 8 },
  primary: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, justifyContent: 'center', marginTop: 24, minHeight: 56, paddingHorizontal: 18, width: '100%' },
  primaryText: { ...typography.titleSmall, color: colors.on },
  secondaryAction: { alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', marginTop: 8, minHeight: 48 },
  secondaryActionText: { ...typography.bodySmall, color: colors.tx, fontWeight: '500', textDecorationLine: 'underline', textDecorationColor: colors.tx },
  activeSession: { backgroundColor: colors.s1, borderColor: colors.ac, borderRadius: 12, borderWidth: 1, marginBottom: 24, padding: 16 },
  activeHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  activeEyebrow: { ...typography.monoLabel, color: colors.t2 },
  activeTitle: { ...typography.titleSmall, color: colors.tx, marginTop: 8 },
  activeProgress: { ...typography.numberSmall, color: colors.t2, marginTop: 6 },
  activeAction: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16, minHeight: 56, paddingHorizontal: 16 },
  activeActionText: { ...typography.titleSmall, color: colors.on },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  sectionTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 8, marginTop: 24 },
  shortcuts: { gap: 8, marginBottom: 8 },
  shortcut: { alignItems: 'center', borderColor: colors.mu, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 12 },
  shortcutText: { ...typography.bodySmall, color: colors.tx, fontWeight: '500' },
  badge: { ...typography.captionSmall, backgroundColor: colors.s2, borderRadius: 10, color: colors.tx, minWidth: 22, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2, textAlign: 'center' },
  shortcutPressed: { backgroundColor: colors.pressed },
})

import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
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
  const references = todayDay
    ? findLatestExerciseLoadReferences(todayDay, sessions)
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
        eyebrow={greeting(now)}
        title="Hoje"
        description={formatReadableDate(now)}
      />
      {!!warning && <Text accessibilityRole="alert" style={styles.warning}>{warning}</Text>}
      {!normalPlans.length ? (
        <EmptyPlan
          title="Nenhuma ficha ativa"
          description="Crie uma ficha para organizar sua semana de treino."
          action="Criar primeira ficha"
          onPress={onCreatePlan}
        />
      ) : !activePlan ? (
        <EmptyPlan
          title="Escolha sua ficha ativa"
          description="Você possui fichas salvas, mas nenhuma está ativa para esta semana."
          action="Abrir fichas"
          onPress={onOpenPlans}
        />
      ) : overview ? (
        <>
          {!!activeSession && (
            <Pressable
              accessibilityLabel={`${activeSession.status === 'PAUSED' ? 'Sessão pausada' : 'Sessão em andamento'}: ${activeSession.workoutName}, ${activeSession.dayName}`}
              accessibilityRole="button"
              onPress={onContinueSession}
              style={({ pressed }) => [styles.activeSession, pressed && styles.pressed]}
            >
              <Text style={styles.activeEyebrow}>
                {activeSession.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO'}
              </Text>
              <Text style={styles.activeTitle}>{activeSession.workoutName} · {activeSession.dayName}</Text>
              <Text style={styles.activeAction}>
                {activeSession.status === 'PAUSED' ? 'Retomar treino' : 'Continuar treino'} →
              </Text>
            </Pressable>
          )}
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
          <TrainingWeekSummary overview={overview} />
          <Text style={styles.sectionTitle}>Atalhos</Text>
          <View style={styles.shortcuts}>
            <Shortcut label="Ficha ativa" onPress={onOpenPlans} />
            <Shortcut label="Fichas arquivadas" onPress={onOpenArchived} />
            <Shortcut label="Lixeira" badge={trashCount} onPress={onOpenTrash} />
            <Shortcut label="Biblioteca" onPress={onOpenLibrary} />
            <Shortcut label="Integrações" onPress={onOpenIntegrations} />
          </View>
        </>
      ) : null}
    </ScreenScrollView>
  )
}

function EmptyPlan({
  title,
  description,
  action,
  onPress,
}: {
  title: string
  description: string
  action: string
  onPress: () => void
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
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
    >
      <Text style={styles.shortcutText}>{label}</Text>
      {!!badge && <Text accessibilityRole="text" style={styles.badge}>{badge > 99 ? '99+' : badge}</Text>}
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  )
}

function greeting(now: Date) {
  const hour = now.getHours()
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
}

function formatReadableDate(now: Date) {
  const text = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
  return text.charAt(0).toLowerCase() + text.slice(1)
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  warning: { ...typography.bodySmall, backgroundColor: colors.surfaceSecondary, borderRadius: 12, color: colors.warning, marginBottom: 12, padding: 12 },
  empty: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: 22 },
  emptyTitle: { color: colors.textPrimary, fontSize: 23, fontWeight: '900', lineHeight: 30 },
  emptyDescription: { ...typography.body, color: colors.textSecondary, marginTop: 9 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginTop: 20, minHeight: 48, paddingHorizontal: 18 },
  primaryText: { ...typography.label, color: colors.onPrimary, fontWeight: '900' },
  activeSession: { backgroundColor: colors.textPrimary, borderRadius: 20, marginBottom: 14, padding: 18 },
  activeEyebrow: { ...typography.caption, color: colors.background, fontWeight: '900', letterSpacing: 1.4 },
  activeTitle: { ...typography.body, color: colors.background, fontWeight: '800', marginTop: 8 },
  activeAction: { ...typography.label, color: colors.primary, fontWeight: '900', marginTop: 14 },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 10 },
  shortcuts: { gap: 8, marginBottom: 12 },
  shortcut: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 56, paddingHorizontal: 16 },
  shortcutText: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '700' },
  badge: { ...typography.caption, backgroundColor: colors.danger, borderRadius: 12, color: colors.white, fontWeight: '900', minWidth: 24, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, textAlign: 'center' },
  arrow: { ...typography.body, color: colors.textSecondary },
  pressed: { opacity: 0.72 },
})

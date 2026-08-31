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

export function HomeScreen({ plans, sessions, loading, activeSession, warning, now = new Date(), onRefresh, onCreatePlan, onOpenPlans, onOpenPlanDay, onStartToday, onContinueSession }: {
  plans: TrainingPlan[]; sessions: WorkoutSession[]; loading: boolean; activeSession: WorkoutSession | null; trashCount: number; warning?: string; now?: Date; onRefresh: () => void; onCreatePlan: () => void; onOpenPlans: () => void; onOpenPlanDay: (planId: number, dayId: number) => void; onStartToday: (planId: number, planDayId: number) => void; onContinueSession: () => void; onOpenArchived: () => void; onOpenTrash: () => void; onOpenLibrary: () => void; onOpenIntegrations: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const normalPlans = plans.filter((plan) => !plan.archived && plan.deletedAt === null)
  const activePlan = normalPlans.find((plan) => plan.active) ?? null
  const overview = activePlan ? buildWeeklyTrainingOverview(activePlan, sessions, activeSession, now) : null
  const todayDay = activePlan?.days.find((day) => day.id === overview?.today.planDayId)
  const references = activePlan && todayDay ? findLatestExerciseLoadReferences(activePlan.id, todayDay, sessions) : []
  const todaySession = overview?.today.sessionId ? [activeSession, ...sessions].find((session) => session?.id === overview.today.sessionId) ?? null : null
  return <ScreenScrollView includeBottomInset={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.ink} />} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow={greeting(now)} title="Hoje" description={formatReadableDate(now)} variant="compact" />
    {!!warning && <Text accessibilityRole="alert" style={styles.warning}>{warning}</Text>}
    {!!activeSession && <ActiveSessionHero session={activeSession} onPress={onContinueSession} />}
    {!normalPlans.length ? <EmptyPlan title="Nenhuma ficha ativa" description="Crie uma ficha para organizar sua semana de treino." action="Criar primeira ficha" onPress={onCreatePlan} />
      : !activePlan ? <EmptyPlan title="Escolha sua ficha ativa" description="Você possui fichas salvas, mas nenhuma está ativa para esta semana." action="Abrir fichas" onPress={onOpenPlans} />
        : overview ? <>
          {!activeSession && <TodayWorkoutCard plan={activePlan} day={overview.today} session={todaySession} references={references} blockedByCurrentSession={false} onStart={() => overview.today.planDayId && onStartToday(activePlan.id, overview.today.planDayId)} onConfigure={() => overview.today.planDayId && onOpenPlanDay(activePlan.id, overview.today.planDayId)} onContinue={onContinueSession} onOpenPlan={onOpenPlans} />}
          <TrainingWeekSummary overview={overview} />
          <Pressable accessibilityLabel="Abrir ficha ativa" accessibilityRole="button" onPress={onOpenPlans} style={styles.planLink}><Text style={styles.planLinkText}>Ver ficha ativa</Text></Pressable>
        </> : null}
  </ScreenScrollView>
}

function ActiveSessionHero({ session, onPress }: { session: WorkoutSession; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors); const paused = session.status === 'PAUSED'
  const progress = session.totalPlannedSets ? Math.round(session.completedSets / session.totalPlannedSets * 100) : 0
  return <Pressable accessibilityLabel={`${paused ? 'Sessão pausada' : 'Sessão em andamento'}: ${session.workoutName}. ${session.completedSets} de ${session.totalPlannedSets} séries concluídas.`} accessibilityRole="button" accessibilityState={{ selected: true }} onPress={onPress} style={({ pressed }) => [styles.activeSession, paused && styles.pausedSession, pressed && styles.pressed]}>
    <View style={styles.activeTopline}><Text style={styles.activeEyebrow}>{paused ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO'}</Text><Text style={styles.activeProgress}>{progress}%</Text></View>
    <Text style={styles.activeTitle}>{session.workoutName}</Text>
    <Text style={styles.activeMeta}>{session.completedSets} / {session.totalPlannedSets} séries{session.totalDurationSeconds > 0 ? ` · ${Math.round(session.totalDurationSeconds / 60)} min` : ''}</Text>
    <View style={styles.activeActionRow}><Text style={styles.activeAction}>{paused ? 'Retomar treino' : 'Continuar treino'}</Text></View>
  </Pressable>
}

function EmptyPlan({ title, description, action, onPress }: { title: string; description: string; action: string; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text><Pressable accessibilityRole="button" onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable></View>
}

function greeting(now: Date) { const hour = now.getHours(); return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite' }
function formatReadableDate(now: Date) { const text = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now); return text.charAt(0).toLowerCase() + text.slice(1) }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  warning: { ...typography.bodySmall, backgroundColor: colors.surfaceSecondary, borderRadius: 12, color: colors.warning, marginBottom: 12, padding: 12 },
  empty: { alignItems: 'flex-start', backgroundColor: colors.surfaceSecondary, borderRadius: 22, padding: 22 },
  emptyTitle: { color: colors.textPrimary, fontSize: 23, fontWeight: '700', lineHeight: 30 }, emptyDescription: { ...typography.body, color: colors.textSecondary, marginTop: 9 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginTop: 20, minHeight: 48, paddingHorizontal: 18 }, primaryText: { ...typography.label, color: colors.onPrimary, fontWeight: '700' },
  activeSession: { backgroundColor: colors.primary, borderRadius: 26, marginBottom: 18, padding: 20 }, pausedSession: { borderColor: colors.warning, borderWidth: 2 }, activeTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activeEyebrow: { ...typography.caption, color: colors.onPrimary, fontWeight: '700', letterSpacing: 1.1 }, activeProgress: { ...typography.label, color: colors.onPrimary, fontVariant: ['tabular-nums'], fontWeight: '700' }, activeTitle: { ...typography.titleSmall, color: colors.onPrimary, fontWeight: '700', marginTop: 12 }, activeMeta: { ...typography.bodySmall, color: colors.onPrimary, marginTop: 4, opacity: 0.9 }, activeActionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, activeAction: { ...typography.label, color: colors.onPrimary, fontWeight: '700' },
  planLink: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minHeight: 48, paddingHorizontal: 4 }, planLinkText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' }, pressed: { opacity: 0.78 },
})

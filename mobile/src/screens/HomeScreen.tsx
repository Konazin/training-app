import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import type { Dashboard, WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { ScreenScrollView } from '../components/Screen'
import { shared, type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

export function HomeScreen({
  dashboard,
  loading,
  activeSession,
  onRefresh,
  onOpenPlan,
  onOpenLibrary,
  onResumeSession,
}: {
  dashboard: Dashboard | null
  loading: boolean
  activeSession: WorkoutSession | null
  onRefresh: () => void
  onOpenPlan: () => void
  onOpenLibrary: () => void
  onResumeSession: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <ScreenScrollView
      includeBottomInset={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.ink} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Dados no aparelho"
        title={`${greeting()},\natleta.`}
        description="Sua rotina continua disponível mesmo em modo avião."
      />

      {!!activeSession && (
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.active, pressed && styles.pressed]} onPress={onResumeSession}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{activeSession.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO ATIVA'}</Text>
            <Text style={styles.activeTitle}>{activeSession.workoutName} · {activeSession.dayName}</Text>
          </View>
          <Text style={styles.activeAction}>Retomar →</Text>
        </Pressable>
      )}

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>FICHA ATIVA</Text>
        <Text style={styles.heroTitle}>{dashboard?.activePlanName ?? 'Monte sua primeira ficha'}</Text>
        <Text style={styles.heroText}>
          {dashboard?.nextWorkoutName
            ? `Próximo dia: ${dashboard.nextWorkoutName}`
            : 'Configure os sete dias da semana no próprio aparelho.'}
        </Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]} onPress={onOpenPlan}>
          <Text style={styles.heroButtonText}>{dashboard?.activePlanName ? 'Abrir ficha' : 'Criar ficha'}</Text>
          <Text style={styles.heroButtonText}>→</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <Metric label="SESSÕES" value={dashboard?.completedSessions ?? 0} />
        <Metric label="ESTA SEMANA" value={dashboard?.weeklySessions ?? 0} />
        <Metric label="ADERÊNCIA" value={`${dashboard?.adherence ?? 0}%`} />
        <Metric label="EXERCÍCIOS" value={dashboard?.totalExercises ?? 0} />
        <Metric label="MINUTOS" value={Math.round((dashboard?.totalDurationSeconds ?? 0) / 60)} />
        <Metric label="VOLUME" value={`${Math.round(dashboard?.totalVolume ?? 0)}kg`} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>HISTÓRICO LOCAL</Text>
          <Text style={styles.sectionTitle}>Sessões recentes</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onOpenLibrary} style={styles.linkButton}><Text style={styles.link}>Biblioteca</Text></Pressable>
      </View>
      {!dashboard?.recentSessions.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Tudo pronto para começar</Text>
          <Text style={styles.emptyText}>Abra a ficha ativa e inicie um dia configurado.</Text>
        </View>
      ) : dashboard.recentSessions.map((session) => (
        <View key={session.id} style={styles.session}>
          <View style={[styles.status, session.status === 'COMPLETED' && styles.completed]}>
            <Text style={styles.statusText}>{session.status === 'COMPLETED' ? '✓' : '×'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionTitle}>{session.workoutName}</Text>
            <Text style={styles.sessionMeta}>{session.dayName} · {formatDate(session.startedAt)}</Text>
          </View>
          <Text style={styles.volume}>{Math.round(session.totalVolume)}kg</Text>
        </View>
      ))}
    </ScreenScrollView>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)).replace('.', '')
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  active: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 12, minHeight: 64, padding: 16 },
  eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
  activeTitle: { ...typography.body, color: colors.textPrimary, flexShrink: 1, fontWeight: '800', marginTop: 5 },
  activeAction: { ...typography.label, color: colors.primary, fontWeight: '800' },
  hero: { backgroundColor: colors.textPrimary, borderRadius: 22, marginBottom: 12, minHeight: 250, padding: 22 },
  heroEyebrow: { ...typography.caption, color: colors.background, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: colors.background, fontSize: 29, fontWeight: '900', lineHeight: 35, marginTop: 36 },
  heroText: { ...typography.bodySmall, color: colors.background, marginTop: 10 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', gap: 25, marginTop: 24, minHeight: 48, paddingHorizontal: 16 },
  heroButtonText: { ...typography.label, color: colors.onPrimary, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: shared.responsive.twoColumnGap, marginBottom: 8 },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, minWidth: shared.responsive.metricMinWidth, padding: 16, width: '47%' },
  metricLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' },
  metricValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', lineHeight: 28, marginTop: 6 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 5 },
  linkButton: { justifyContent: 'center', minHeight: 48 },
  link: { ...typography.label, color: colors.primary, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 30 },
  emptyTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 7, textAlign: 'center' },
  session: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, minHeight: 72, padding: 12 },
  status: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  completed: { backgroundColor: '#d1fae5' },
  statusText: { color: '#047857', fontWeight: '900' },
  sessionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '800' },
  sessionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  volume: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  pressed: { opacity: 0.72 },
})

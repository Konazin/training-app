import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { Dashboard, WorkoutSession } from '@training/training-domain'
import { ScreenHeader } from '../components/ScreenHeader'
import { shared, type ThemeColors, useTheme } from '../theme'

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
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.ink} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Dados no aparelho"
        title={`${greeting()},\natleta.`}
        description="Sua rotina continua disponível mesmo em modo avião."
      />

      {!!activeSession && (
        <TouchableOpacity style={styles.active} onPress={onResumeSession}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{activeSession.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO ATIVA'}</Text>
            <Text style={styles.activeTitle}>{activeSession.workoutName} · {activeSession.dayName}</Text>
          </View>
          <Text style={styles.activeAction}>Retomar →</Text>
        </TouchableOpacity>
      )}

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>FICHA ATIVA</Text>
        <Text style={styles.heroTitle}>{dashboard?.activePlanName ?? 'Monte sua primeira ficha'}</Text>
        <Text style={styles.heroText}>
          {dashboard?.nextWorkoutName
            ? `Próximo dia: ${dashboard.nextWorkoutName}`
            : 'Configure os sete dias da semana no próprio aparelho.'}
        </Text>
        <TouchableOpacity style={styles.heroButton} onPress={onOpenPlan}>
          <Text style={styles.heroButtonText}>{dashboard?.activePlanName ? 'Abrir ficha' : 'Criar ficha'}</Text>
          <Text style={styles.heroButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <Metric label="SESSÕES" value={dashboard?.completedSessions ?? 0} />
        <Metric label="ESTA SEMANA" value={dashboard?.weeklySessions ?? 0} />
        <Metric label="ADERÊNCIA" value={`${dashboard?.adherence ?? 0}%`} />
      </View>
      <View style={styles.metrics}>
        <Metric label="EXERCÍCIOS" value={dashboard?.totalExercises ?? 0} />
        <Metric label="MINUTOS" value={Math.round((dashboard?.totalDurationSeconds ?? 0) / 60)} />
        <Metric label="VOLUME" value={`${Math.round(dashboard?.totalVolume ?? 0)}kg`} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>HISTÓRICO LOCAL</Text>
          <Text style={styles.sectionTitle}>Sessões recentes</Text>
        </View>
        <TouchableOpacity onPress={onOpenLibrary}><Text style={styles.link}>Biblioteca</Text></TouchableOpacity>
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
    </ScrollView>
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
  content: { padding: shared.pagePadding, paddingBottom: 124 },
  active: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 15 },
  eyebrow: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  activeTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 5 },
  activeAction: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  hero: { backgroundColor: colors.nearBlack, borderRadius: 28, marginBottom: 10, minHeight: 250, padding: 22 },
  heroEyebrow: { color: colors.gray400, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '900', marginTop: 45 },
  heroText: { color: colors.gray400, fontSize: 11, lineHeight: 17, marginTop: 10 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', gap: 25, marginTop: 24, paddingHorizontal: 16, paddingVertical: 13 },
  heroButtonText: { color: '#111', fontSize: 10, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metric: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 17, borderWidth: 1, flex: 1, padding: 13 },
  metricLabel: { color: colors.gray400, fontSize: 7, fontWeight: '800' },
  metricValue: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 6 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 5 },
  link: { color: colors.primary, fontSize: 9, fontWeight: '800', padding: 8 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 30 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.gray500, fontSize: 9, marginTop: 7, textAlign: 'center' },
  session: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 11 },
  status: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  completed: { backgroundColor: '#d1fae5' },
  statusText: { color: '#047857', fontWeight: '900' },
  sessionTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  sessionMeta: { color: colors.gray500, fontSize: 8, marginTop: 4 },
  volume: { color: colors.ink, fontSize: 9, fontWeight: '800' },
})

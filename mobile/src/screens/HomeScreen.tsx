import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import { StatusPill } from '../components/StatusPill'
import type { Dashboard } from '../models/training'
import { colors, shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  dashboard: Dashboard | null
  loading: boolean
  onRefresh: () => void
  onNavigate: (screen: 'workouts' | 'exercise') => void
}

export function HomeScreen({ dashboard, loading, onRefresh, onNavigate }: Props) {
  styles = createStyles(useTheme().colors)
  const highlighted =
    dashboard?.recentWorkouts.find((item) => item.status !== 'COMPLETED')
    ?? dashboard?.recentWorkouts[0]
  const completion = dashboard?.totalWorkouts
    ? Math.round((dashboard.completedWorkouts / dashboard.totalWorkouts) * 100)
    : 0
  const week = getWeek()

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.black} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Visão geral"
        title={`${getGreeting()},\natleta.`}
        description="Tudo que importa para manter sua rotina em movimento."
      />

      <View style={styles.hero}>
        <View style={styles.orbitLarge} />
        <View style={styles.orbitSmall} />
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>SESSÃO EM DESTAQUE</Text>
          {!!highlighted && <StatusPill status={highlighted.status} />}
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroDate}>
            {highlighted ? formatDate(highlighted.scheduledDate) : 'Sua próxima sessão'}
          </Text>
          <Text style={styles.heroTitle}>{highlighted?.name ?? 'Crie seu primeiro treino'}</Text>
          <Text numberOfLines={2} style={styles.heroDescription}>
            {highlighted?.description || 'Organize a rotina e deixe o próximo passo pronto para quando a motivação chegar.'}
          </Text>
        </View>
        <View style={styles.heroFooter}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.heroButton}
            onPress={() => onNavigate(highlighted ? 'exercise' : 'workouts')}
          >
            <Text style={styles.heroButtonText}>{highlighted ? 'Adicionar exercício' : 'Montar treino'}</Text>
            <Text style={styles.heroArrow}>→</Text>
          </TouchableOpacity>
          {!!highlighted && (
            <Text style={styles.heroMeta}>{highlighted.durationMinutes} min  ·  {highlighted.exercises.length} exercícios</Text>
          )}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.progressCopy}>
          <Text style={styles.cardEyebrow}>PROGRESSO GERAL</Text>
          <Text style={styles.progressTitle}>Sua consistência</Text>
          <Text style={styles.progressDescription}>
            {dashboard?.completedWorkouts ?? 0} de {dashboard?.totalWorkouts ?? 0} treinos concluídos
          </Text>
        </View>
        <View style={styles.progressRing}>
          <View style={styles.progressInner}>
            <Text style={styles.progressValue}>{completion}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricCard symbol="◷" value={dashboard?.totalMinutes ?? 0} label="minutos" />
        <MetricCard symbol="⌁" value={dashboard?.totalExercises ?? 0} label="exercícios" />
        <MetricCard symbol="♨" value={dashboard?.totalCalories ?? 0} label="kcal" />
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.cardEyebrow}>ESTA SEMANA</Text>
          <Text style={styles.sectionTitle}>Ritmo da rotina</Text>
        </View>
        <Text style={styles.sectionSymbol}>▦</Text>
      </View>
      <View style={styles.weekCard}>
        {week.map((day) => (
          <View key={`${day.label}-${day.day}`} style={[styles.day, day.today && styles.dayToday]}>
            <Text style={[styles.dayLabel, day.today && styles.dayTextToday]}>{day.label}</Text>
            <Text style={[styles.dayNumber, day.today && styles.dayTextToday]}>{day.day}</Text>
            {day.today && <View style={styles.todayDot} />}
          </View>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.cardEyebrow}>HISTÓRICO</Text>
          <Text style={styles.sectionTitle}>Treinos recentes</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton} onPress={() => onNavigate('workouts')}>
          <Text style={styles.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      {!dashboard?.recentWorkouts.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>＋</Text>
          <Text style={styles.emptyTitle}>Sua rotina começa aqui</Text>
          <Text style={styles.emptyText}>Crie um treino para acompanhar sua evolução.</Text>
        </View>
      ) : (
        dashboard.recentWorkouts.map((workout, index) => (
          <TouchableOpacity
            key={workout.id}
            activeOpacity={0.75}
            style={styles.workoutCard}
            onPress={() => onNavigate('workouts')}
          >
            <View style={styles.workoutIndex}>
              <Text style={styles.workoutIndexText}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
            <View style={styles.workoutDetails}>
              <Text numberOfLines={1} style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutMeta}>
                {formatDate(workout.scheduledDate)} · {workout.exercises.length} exercícios
              </Text>
            </View>
            <StatusPill status={workout.status} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

function MetricCard({ symbol, value, label }: { symbol: string; value: number; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricSymbol}>{symbol}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
}

function getWeek() {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - mondayOffset + index)
    return {
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').slice(0, 3),
      day: date.getDate(),
      today: date.toDateString() === today.toDateString(),
    }
  })
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replace('.', '')
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    padding: shared.pagePadding,
    paddingBottom: 124,
  },
  hero: {
    backgroundColor: colors.nearBlack,
    borderRadius: 28,
    minHeight: 310,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  orbitLarge: {
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 210,
    position: 'absolute',
    right: -70,
    top: -70,
    width: 210,
  },
  orbitSmall: {
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    borderWidth: 1,
    height: 140,
    position: 'absolute',
    right: -10,
    top: 5,
    width: 140,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    borderWidth: 1,
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.3,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroCopy: {
    marginTop: 34,
    maxWidth: 300,
  },
  heroDate: {
    color: colors.gray500,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 29,
    fontWeight: '600',
    letterSpacing: -1,
    lineHeight: 33,
    marginTop: 8,
  },
  heroDescription: {
    color: colors.gray400,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  heroFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 24,
  },
  heroButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 15,
  },
  heroButtonText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '800',
  },
  heroArrow: {
    color: colors.black,
    fontSize: 17,
  },
  heroMeta: {
    color: colors.gray500,
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    padding: 17,
  },
  progressCopy: {
    flex: 1,
  },
  cardEyebrow: {
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  progressTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  progressDescription: {
    color: colors.gray500,
    fontSize: 10,
    marginTop: 6,
  },
  progressRing: {
    alignItems: 'center',
    borderColor: colors.nearBlack,
    borderRadius: 99,
    borderRightColor: colors.gray200,
    borderWidth: 7,
    height: 72,
    justifyContent: 'center',
    transform: [{ rotate: '-22deg' }],
    width: 72,
  },
  progressInner: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 99,
    height: 52,
    justifyContent: 'center',
    transform: [{ rotate: '22deg' }],
    width: 52,
  },
  progressValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  metricSymbol: {
    color: colors.gray500,
    fontSize: 17,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 10,
  },
  metricLabel: {
    color: colors.gray500,
    fontSize: 9,
    marginTop: 3,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 27,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 5,
  },
  sectionSymbol: {
    color: colors.gray500,
    fontSize: 20,
  },
  weekCard: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 7,
  },
  day: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 66,
  },
  dayToday: {
    backgroundColor: colors.nearBlack,
  },
  dayLabel: {
    color: colors.gray400,
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dayNumber: {
    color: colors.gray500,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  dayTextToday: {
    color: colors.white,
  },
  todayDot: {
    backgroundColor: colors.white,
    borderRadius: 9,
    height: 3,
    marginTop: 5,
    width: 3,
  },
  seeAllButton: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  seeAll: {
    color: colors.gray500,
    fontSize: 10,
    fontWeight: '800',
  },
  workoutCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    padding: 10,
  },
  workoutIndex: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  workoutIndexText: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
  },
  workoutDetails: {
    flex: 1,
    marginHorizontal: 11,
  },
  workoutName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  workoutMeta: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 25,
  },
  emptyIcon: {
    color: colors.gray400,
    fontSize: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyText: {
    color: colors.gray500,
    fontSize: 10,
    marginTop: 5,
  },
})

let styles = createStyles(colors)

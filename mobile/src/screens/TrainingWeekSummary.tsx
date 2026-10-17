import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import type { WeeklyTrainingDayOverview, WeeklyTrainingOverview } from '@training/training-domain'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

const weekdayLabels = {
  MONDAY: 'seg',
  TUESDAY: 'ter',
  WEDNESDAY: 'qua',
  THURSDAY: 'qui',
  FRIDAY: 'sex',
  SATURDAY: 'sáb',
  SUNDAY: 'dom',
} as const

const statusLabels = {
  COMPLETED: 'Feito',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  READY: 'Hoje',
  SCHEDULED: 'Previsto',
  REST: 'Desc.',
  MISSED: 'Pendente',
  ABANDONED: 'Parcial',
  UNCONFIGURED: 'Vazio',
} as const

export function TrainingWeekSummary({ overview }: { overview: WeeklyTrainingOverview }) {
  const [expanded, setExpanded] = useState(true)
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const progressText = `${overview.completedTrainingDays} de ${overview.plannedTrainingDays} treinos concluídos`
  const width = overview.plannedTrainingDays
    ? `${overview.progressPercent}%` as `${number}%`
    : '0%'

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>semana</Text>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
        <Pressable
          accessibilityLabel={expanded ? 'Recolher resumo semanal' : 'Expandir resumo semanal'}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [styles.expand, pressed && styles.pressed]}
        >
          <Text style={styles.expandText}>{expanded ? 'Recolher' : 'Expandir'}</Text>
        </Pressable>
      </View>
      <View
        accessibilityLabel={progressText}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: overview.plannedTrainingDays,
          now: overview.completedTrainingDays,
          text: progressText,
        }}
        style={styles.track}
      >
        <View style={[styles.fill, { width }]} />
      </View>
      {expanded && (
        <View style={styles.days}>
          {overview.days.map((day) => (
            <WeekdayCell key={day.dateKey} day={day} />
          ))}
        </View>
      )}
    </View>
  )
}

function WeekdayCell({ day }: { day: WeeklyTrainingDayOverview }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const label = statusLabels[day.status]
  const date = Number(day.dateKey.slice(-2))

  return (
    <View
      accessibilityLabel={`${weekdayLabels[day.weekday]}, ${date}, ${day.title}, ${label}${day.isToday ? ', hoje' : ''}`}
      accessibilityState={{ selected: day.isToday }}
      style={[styles.day, day.isToday && styles.today]}
    >
      <Text style={[styles.weekday, day.isToday && styles.todayText]}>{weekdayLabels[day.weekday]}</Text>
      <StateGlyph status={day.status} />
      <Text style={[styles.status, day.isToday && styles.todayText]}>{label}</Text>
    </View>
  )
}

function StateGlyph({ status }: { status: WeeklyTrainingDayOverview['status'] }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  if (status === 'COMPLETED') {
    return <View style={styles.completedGlyph}><Check color={colors.on} size={13} strokeWidth={2.2} /></View>
  }
  if (status === 'ABANDONED') {
    return <View style={styles.partialGlyph}><View style={styles.partialFill} /></View>
  }
  if (status === 'REST') return <View style={styles.restGlyph} />
  if (status === 'ACTIVE' || status === 'PAUSED') return <View style={styles.activeGlyph} />
  if (status === 'READY') {
    return <View style={styles.todayGlyph}><View style={styles.todayDot} /></View>
  }
  return <View style={styles.pendingGlyph} />
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: 8, marginTop: 8 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  eyebrow: { ...typography.monoLabel, color: colors.t2 },
  progressText: { ...typography.bodySmall, color: colors.tx, marginTop: 4 },
  expand: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 },
  expandText: { ...typography.bodySmall, color: colors.tx, fontWeight: '500', textDecorationLine: 'underline', textDecorationColor: colors.tx },
  track: { backgroundColor: colors.s2, borderRadius: 2, height: 3, marginTop: 12, overflow: 'hidden' },
  fill: { backgroundColor: colors.ac, borderRadius: 2, height: 3 },
  days: { flexDirection: 'row', gap: 2, justifyContent: 'space-between', marginTop: 12 },
  day: { alignItems: 'center', borderRadius: 10, flex: 1, gap: 4, justifyContent: 'center', minHeight: 76, paddingHorizontal: 1, paddingVertical: 6 },
  today: { backgroundColor: colors.s2 },
  weekday: { ...typography.captionSmall, color: colors.t2 },
  todayText: { color: colors.tx, fontWeight: '600' },
  status: { ...typography.captionSmall, color: colors.t2, textAlign: 'center' },
  completedGlyph: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 10, height: 20, justifyContent: 'center', width: 20 },
  partialGlyph: { borderColor: colors.t2, borderRadius: 10, borderWidth: 1, height: 20, overflow: 'hidden', width: 20 },
  partialFill: { backgroundColor: colors.t2, bottom: 0, left: 0, position: 'absolute', top: 0, width: '50%' },
  restGlyph: { backgroundColor: colors.mu, borderRadius: 1, height: 2, marginVertical: 9, width: 16 },
  activeGlyph: { backgroundColor: colors.ac, borderRadius: 5, height: 10, marginVertical: 5, width: 10 },
  todayGlyph: { alignItems: 'center', borderColor: colors.tx, borderRadius: 10, borderWidth: 1, height: 20, justifyContent: 'center', width: 20 },
  todayDot: { backgroundColor: colors.tx, borderRadius: 3, height: 6, width: 6 },
  pendingGlyph: { borderColor: colors.t2, borderRadius: 10, borderWidth: 1, height: 18, marginVertical: 1, width: 18 },
  pressed: { opacity: 0.72 },
})

import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { WeeklyTrainingOverview } from '@training/training-domain'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

const weekdayLabels = {
  MONDAY: 'SEG',
  TUESDAY: 'TER',
  WEDNESDAY: 'QUA',
  THURSDAY: 'QUI',
  FRIDAY: 'SEX',
  SATURDAY: 'SÁB',
  SUNDAY: 'DOM',
} as const

const statusLabels = {
  COMPLETED: 'Concluído',
  ACTIVE: 'Em andamento',
  PAUSED: 'Pausado',
  READY: 'Hoje',
  SCHEDULED: 'Programado',
  REST: 'Descanso',
  MISSED: 'Não registrado',
  ABANDONED: 'Não concluído',
  UNCONFIGURED: 'Não configurado',
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ESTA SEMANA</Text>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
        <Pressable
          accessibilityLabel={expanded ? 'Recolher resumo semanal' : 'Expandir resumo semanal'}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          style={styles.expand}
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
            <View
              accessibilityLabel={`${weekdayLabels[day.weekday]}, ${Number(day.dateKey.slice(-2))}, ${day.title}, ${statusLabels[day.status]}${day.isToday ? ', hoje' : ''}`}
              accessibilityState={{ selected: day.isToday }}
              key={day.dateKey}
              style={[styles.day, day.isToday && styles.today]}
            >
              <View style={styles.date}>
                <Text style={styles.weekday}>{weekdayLabels[day.weekday]}</Text>
                <Text style={styles.dayNumber}>{Number(day.dateKey.slice(-2))}</Text>
              </View>
              <Text numberOfLines={2} style={styles.title}>{day.title}</Text>
              <Text style={[styles.status, day.isToday && styles.todayStatus]}>
                {statusLabels[day.status]}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 20, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 },
  progressText: { ...typography.body, color: colors.textPrimary, fontWeight: '800', marginTop: 5 },
  expand: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 8 },
  expandText: { ...typography.label, color: colors.primary, fontWeight: '800' },
  track: { backgroundColor: colors.surfaceSecondary, borderRadius: 5, height: 10, marginTop: 14, overflow: 'hidden' },
  fill: { backgroundColor: colors.primary, borderRadius: 5, height: 10 },
  days: { marginTop: 12 },
  day: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: 8, paddingVertical: 7 },
  today: { backgroundColor: colors.surfaceSecondary, borderRadius: 12 },
  date: { alignItems: 'center', width: 42 },
  weekday: { ...typography.caption, color: colors.textSecondary, fontWeight: '800' },
  dayNumber: { ...typography.body, color: colors.textPrimary, fontWeight: '900' },
  title: { ...typography.bodySmall, color: colors.textPrimary, flex: 1, fontWeight: '700' },
  status: { ...typography.caption, color: colors.textSecondary, maxWidth: 94, textAlign: 'right' },
  todayStatus: { color: colors.primary, fontWeight: '900' },
})

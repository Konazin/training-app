import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { WeeklyTrainingOverview } from '@training/training-domain'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

const weekdayLabels = { MONDAY: 'SEG', TUESDAY: 'TER', WEDNESDAY: 'QUA', THURSDAY: 'QUI', FRIDAY: 'SEX', SATURDAY: 'SÁB', SUNDAY: 'DOM' } as const
const statusLabels = { COMPLETED: 'Concluído', ACTIVE: 'Em andamento', PAUSED: 'Pausado', READY: 'Hoje', SCHEDULED: 'Programado', REST: 'Descanso', MISSED: 'Não registrado', ABANDONED: 'Não concluído', UNCONFIGURED: 'Não configurado' } as const

export function TrainingWeekSummary({ overview }: { overview: WeeklyTrainingOverview }) {
  const [expanded, setExpanded] = useState(false)
  const { colors } = useTheme(); const styles = createStyles(colors)
  const progressText = `${overview.completedTrainingDays} de ${overview.plannedTrainingDays} treinos concluídos`
  const width = overview.plannedTrainingDays ? `${overview.progressPercent}%` as `${number}%` : '0%'
  return <View style={styles.card}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>ESTA SEMANA</Text><Text style={styles.progressText}>{progressText}</Text></View><Pressable accessibilityLabel={expanded ? 'Recolher resumo semanal' : 'Expandir resumo semanal'} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={styles.expand}><Text style={styles.expandText}>{expanded ? 'Menos detalhes' : 'Ver detalhes'}</Text></Pressable></View>
    <View style={styles.daysCompact}>{overview.days.map((day) => <View key={day.dateKey} accessibilityLabel={`${weekdayLabels[day.weekday]}, ${statusLabels[day.status]}${day.isToday ? ', hoje' : ''}`} accessibilityState={{ selected: day.isToday }} style={styles.compactDay}><Text style={[styles.weekday, day.isToday && styles.todayText]}>{weekdayLabels[day.weekday]}</Text><View style={[styles.marker, markerStyle(day.status, colors), day.isToday && styles.todayMarker]}>{day.status === 'COMPLETED' && <Text style={styles.markerText}>✓</Text>}{day.status === 'PAUSED' && <Text style={styles.pausedMarkerText}>II</Text>}</View></View>)}</View>
    <View accessibilityLabel={progressText} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: overview.plannedTrainingDays, now: overview.completedTrainingDays, text: progressText }} style={styles.track}><View style={[styles.fill, { width }]} /></View>
    {expanded && <View style={styles.details}>{overview.days.map((day) => <View key={day.dateKey} style={[styles.dayRow, day.isToday && styles.todayRow]}><Text style={styles.dayDate}>{weekdayLabels[day.weekday]} {Number(day.dateKey.slice(-2))}</Text><Text numberOfLines={1} style={styles.title}>{day.title}</Text><Text style={styles.status}>{statusLabels[day.status]}</Text></View>)}</View>}
  </View>
}

function markerStyle(status: keyof typeof statusLabels, colors: ThemeColors) {
  if (status === 'COMPLETED') return { backgroundColor: colors.primary }
  if (status === 'ACTIVE' || status === 'PAUSED' || status === 'READY') return { backgroundColor: colors.surfaceSecondary, borderColor: colors.primary, borderWidth: 2 }
  if (status === 'REST') return { backgroundColor: colors.surfaceTertiary }
  return { backgroundColor: colors.surfaceSecondary }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, marginBottom: 16, padding: 16 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1.1 }, progressText: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginTop: 4 }, expand: { alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 }, expandText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  daysCompact: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, compactDay: { alignItems: 'center', minWidth: 32 }, weekday: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' }, todayText: { color: colors.primary, fontWeight: '800' }, marker: { alignItems: 'center', borderRadius: 9, height: 18, justifyContent: 'center', marginTop: 6, width: 18 }, todayMarker: { borderColor: colors.primary, borderWidth: 3 }, track: { backgroundColor: colors.surfaceSecondary, borderRadius: 4, height: 8, marginTop: 18, overflow: 'hidden' }, fill: { backgroundColor: colors.primary, borderRadius: 4, height: 8 },
  markerText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' }, pausedMarkerText: { color: colors.textPrimary, fontSize: 9, fontWeight: '800' },
  details: { marginTop: 14 }, dayRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, minHeight: 48 }, todayRow: { backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 8 }, dayDate: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', width: 52 }, title: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 }, status: { ...typography.caption, color: colors.textSecondary, maxWidth: 88, textAlign: 'right' },
})

import { StyleSheet, Text, View } from 'react-native'
import {
  WEEKDAYS,
  analyzeTrainingPlanWeekPreview,
  type TrainingPlanDayCreationInput,
  type Weekday,
} from '@training/training-domain'
import { shared, type ThemeColors, useTheme } from '../../../theme'

type PreviewDay = TrainingPlanDayCreationInput & {
  exercises?: readonly unknown[]
  restActivities?: readonly unknown[]
}

const abbreviations: Record<Weekday, string> = {
  MONDAY: 'SEG',
  TUESDAY: 'TER',
  WEDNESDAY: 'QUA',
  THURSDAY: 'QUI',
  FRIDAY: 'SEX',
  SATURDAY: 'SÁB',
  SUNDAY: 'DOM',
}

export function TrainingPlanWeekPreview({ days }: { days: readonly PreviewDay[] }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const ordered = WEEKDAYS.map((weekday) => days.find((day) => day.weekday === weekday))
  const warnings = analyzeTrainingPlanWeekPreview(days)
  return (
    <View accessibilityLabel="Prévia da estrutura semanal">
      <View style={styles.week}>
        {ordered.map((day, index) => {
          const exerciseCount = day?.exercises?.length ?? 0
          const activityCount = day?.restActivities?.length ?? 0
          const warning = day && !day.restDay && exerciseCount === 0
          return (
            <View
              accessibilityLabel={day
                ? `${abbreviations[day.weekday]}, ${day.title}, ${day.restDay ? 'descanso' : 'treino'}, ${exerciseCount} exercícios, ${activityCount} atividades`
                : `${abbreviations[WEEKDAYS[index]!]}, dia ausente`}
              key={WEEKDAYS[index]}
              style={[styles.day, day?.restDay && styles.rest, (!day || warning) && styles.warning]}
            >
              <Text style={styles.weekday}>{abbreviations[WEEKDAYS[index]!]}</Text>
              <Text style={styles.dayTitle}>{day?.title || 'Dia vazio'}</Text>
              <Text style={styles.meta}>{day?.restDay ? 'Descanso' : day ? 'Treino' : 'Não configurado'}</Text>
              {!!exerciseCount && <Text style={styles.count}>{exerciseCount} exercícios</Text>}
              {!!activityCount && <Text style={styles.count}>{activityCount} atividades</Text>}
              {warning && <Text style={styles.warningText}>Sem exercícios</Text>}
            </View>
          )
        })}
      </View>
      {warnings.map((warning, index) => (
        <Text key={`${warning.code}:${'weekday' in warning ? warning.weekday : index}`} style={styles.notice}>
          {warning.message}
        </Text>
      ))}
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  week: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { borderColor: colors.primary, borderRadius: 14, borderWidth: 1, minHeight: 112, padding: 10, width: '31%' },
  rest: { borderColor: colors.border },
  warning: { borderColor: colors.warning },
  weekday: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  dayTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', lineHeight: 18, marginTop: 5 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  count: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  warningText: { color: colors.warning, fontSize: 12, fontWeight: '800', marginTop: 5 },
  notice: { backgroundColor: colors.surfaceSecondary, borderRadius: 10, color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 8, padding: shared.spacing.sm },
})

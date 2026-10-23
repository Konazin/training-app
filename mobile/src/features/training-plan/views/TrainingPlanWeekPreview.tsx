import { StyleSheet, Text, View } from 'react-native'
import {
  WEEKDAYS,
  analyzeTrainingPlanWeekPreview,
  type TrainingPlanDayCreationInput,
  type Weekday,
} from '@training/training-domain'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { fontFamilies } from '../../../theme/typography'

type PreviewDay = TrainingPlanDayCreationInput & {
  exercises?: readonly unknown[]
  restActivities?: readonly unknown[]
}

const abbreviations: Record<Weekday, string> = {
  MONDAY: 'seg',
  TUESDAY: 'ter',
  WEDNESDAY: 'qua',
  THURSDAY: 'qui',
  FRIDAY: 'sex',
  SATURDAY: 'sáb',
  SUNDAY: 'dom',
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
              <Text style={styles.meta}>{day?.restDay ? 'descanso' : day ? 'treino' : 'não configurado'}</Text>
              {!!exerciseCount && <Text style={styles.count}>{exerciseCount} exercícios</Text>}
              {!!activityCount && <Text style={styles.count}>{activityCount} atividades</Text>}
              {warning && <Text style={styles.warningText}>sem exercícios</Text>}
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
  week: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  day: { borderBottomColor: colors.bd, borderBottomWidth: 1, borderColor: 'transparent', flexBasis: '33.33%', flexGrow: 1, minHeight: 106, padding: 12 },
  rest: { borderLeftColor: colors.mu },
  warning: { borderLeftColor: colors.dg },
  weekday: { color: colors.mu, fontFamily: fontFamilies.data, fontSize: 12, fontWeight: '400' },
  dayTitle: { color: colors.tx, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500', lineHeight: 18, marginTop: 6 },
  meta: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 12, marginTop: 5 },
  count: { color: colors.t2, fontFamily: fontFamilies.text, fontSize: 12, marginTop: 3 },
  warningText: { color: colors.dg, fontFamily: fontFamilies.text, fontSize: 12, fontWeight: '500', marginTop: 5 },
  notice: { backgroundColor: colors.s1, borderRadius: 14, color: colors.t2, fontFamily: fontFamilies.text, fontSize: 13, lineHeight: 18, marginTop: 8, padding: shared.spacing.sm },
})

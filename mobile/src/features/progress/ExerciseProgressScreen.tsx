import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { TrendingUp } from 'lucide-react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import {
  buildExerciseProgress,
  type ExerciseDefinition,
  type WorkoutSession,
} from '@training/training-domain'
import type { RootStackParamList } from '../../navigation/types'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenScrollView } from '../../components/Screen'
import { EmptyState } from '../../components/ui'
import { AnimatedNumber, ProgressBar, Reveal } from '../../motion'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'

const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
const day = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
  .format(new Date(iso)).replaceAll('.', '')

export function ExerciseProgressScreen({
  exercises,
  sessions,
}: {
  exercises: ExerciseDefinition[]
  sessions: WorkoutSession[]
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseProgress'>>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const exercise = exercises.find((item) => item.id === route.params.exerciseId)
  const progress = useMemo(
    () => buildExerciseProgress(sessions, route.params.exerciseId),
    [sessions, route.params.exerciseId],
  )
  const { records, points } = progress
  const maxOneRm = Math.max(1, ...points.map((point) => point.estimatedOneRepMax))
  return (
    <ScreenScrollView>
      <ScreenHeader
        title={exercise?.name ?? 'Progresso'}
        description="Calculado só com séries concluídas, neste aparelho. O 1RM é uma estimativa (Epley)."
      />
      {!points.length ? (
        <EmptyState
          description="Conclua séries com carga neste exercício para ver evolução e recordes."
          icon={<TrendingUp color={colors.tx} size={24} strokeWidth={1.5} />}
          title="Sem histórico ainda"
        />
      ) : (
        <>
          <Reveal>
            <View style={styles.records}>
              <Record label="Maior carga" value={records.heaviestLoad!.value} suffix=" kg"
                detail={`${records.heaviestLoad!.reps} repetições · ${day(records.heaviestLoad!.completedAt)}`} />
              <Record label="1RM estimado" value={records.bestOneRepMax!.value} suffix=" kg"
                detail={day(records.bestOneRepMax!.completedAt)} />
              <Record label="Melhor volume" value={Math.round(records.bestSessionVolume!.value)} suffix=" kg"
                detail={day(records.bestSessionVolume!.completedAt)} />
            </View>
          </Reveal>
          <Text accessibilityRole="header" style={styles.section}>Evolução do 1RM estimado</Text>
          {[...points].reverse().map((point, index) => (
            <Reveal index={index + 1} key={point.sessionId}>
              <View
                accessibilityLabel={`${day(point.completedAt)}: ${kg(point.topLoad)} por ${point.topReps}, 1RM estimado ${kg(point.estimatedOneRepMax)}`}
                style={styles.row}
              >
                <View style={styles.rowHead}>
                  <Text style={styles.date}>{day(point.completedAt)}</Text>
                  <Text style={styles.rowValue}>{kg(point.topLoad)} × {point.topReps}</Text>
                  <Text style={styles.date}>{kg(point.estimatedOneRepMax)}</Text>
                </View>
                <ProgressBar color={colors.tx} progress={point.estimatedOneRepMax / maxOneRm} trackColor={colors.s2} />
              </View>
            </Reveal>
          ))}
        </>
      )}
    </ScreenScrollView>
  )

  function Record({ label, value, suffix, detail }: { label: string; value: number; suffix: string; detail: string }) {
    return (
      <View accessibilityLabel={`${label}: ${value}${suffix}. ${detail}`} style={styles.record}>
        <Text style={styles.label}>{label}</Text>
        <AnimatedNumber adjustsFontSizeToFit format={(current) => `${current.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${suffix}`}
          minimumFontScale={0.8} style={styles.value} value={value} />
        <Text style={styles.detail}>{detail}</Text>
      </View>
    )
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  records: { columnGap: 12, flexDirection: 'row', flexWrap: 'wrap', marginBottom: shared.spacing.lg, rowGap: 12 },
  record: { backgroundColor: colors.s1, borderRadius: shared.radii.lg, flexBasis: '47%', flexGrow: 1, minWidth: 128, padding: 16 },
  label: { ...typography.caption, color: colors.t2 },
  value: { ...typography.numberLarge, color: colors.tx, marginTop: 8 },
  detail: { ...typography.captionSmall, color: colors.t2, marginTop: 5 },
  section: { ...typography.titleSmall, color: colors.tx, marginBottom: shared.spacing.sm },
  row: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, paddingVertical: 14 },
  rowHead: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  date: { ...typography.numberSmall, color: colors.t2 },
  rowValue: { ...typography.body, color: colors.tx },
})

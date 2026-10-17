import { Pressable, StyleSheet, Text, View } from 'react-native'
import type {
  ExerciseLoadReference,
  TrainingPlan,
  WeeklyTrainingDayOverview,
  WorkoutSession,
} from '@training/training-domain'
import { type ThemeColors, useTheme } from '../theme'
import { typography } from '../theme/typography'

export function TodayWorkoutCard({
  plan,
  day,
  session,
  references,
  blockedByCurrentSession,
  onStart,
  onConfigure,
  onContinue,
  onOpenPlan,
}: {
  plan: TrainingPlan
  day: WeeklyTrainingDayOverview
  session: WorkoutSession | null
  references: ExerciseLoadReference[]
  blockedByCurrentSession: boolean
  onStart: () => void
  onConfigure: () => void
  onContinue: () => void
  onOpenPlan: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const action = actionFor(day, blockedByCurrentSession, {
    onStart,
    onConfigure,
    onContinue,
    onOpenPlan,
  })
  const planDay = plan.days.find((item) => item.id === day.planDayId)

  return (
    <View
      accessibilityLabel={`Treino de hoje: ${day.title}. ${statusLabel(day.status)}.`}
      style={styles.card}
    >
      <Text style={styles.eyebrow}>treino · {plan.name}</Text>
      <Text style={styles.title}>{day.title}</Text>
      <Text style={styles.status}>{statusCopy(day, session)}</Text>
      {day.status === 'READY' && day.exerciseCount > 0 && (
        <>
          <View style={styles.exerciseList}>
            {planDay?.exercises.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.exerciseRow}>
                <Text numberOfLines={1} style={styles.exerciseName}>{item.exercise.name}</Text>
                <Text style={styles.exercisePrescription}>
                  {item.sets}×{item.minReps}–{item.maxReps}
                  {item.plannedLoad != null ? ` · ${formatLoad(item.plannedLoad)} kg` : ''}
                </Text>
              </View>
            ))}
            {day.exerciseCount > 3 && (
              <Text style={styles.moreExercises}>e mais {day.exerciseCount - 3} exercícios</Text>
            )}
          </View>
          <Text style={styles.meta}>
            {day.plannedSets} séries
            {day.estimatedDurationMinutes > 0 ? ` · cerca de ${day.estimatedDurationMinutes} min` : ''}
          </Text>
        </>
      )}
      {day.status === 'REST' && !!planDay?.restActivities.length && (
        <View style={styles.exerciseList}>
          {planDay.restActivities.slice(0, 3).map((activity) => (
            <View key={activity.id} style={styles.exerciseRow}>
              <Text numberOfLines={1} style={styles.exerciseName}>{activity.name}</Text>
              <Text style={styles.exercisePrescription}>{activity.estimatedDurationMinutes} min</Text>
            </View>
          ))}
          {planDay.restActivities.length > 3 && (
            <Text style={styles.moreExercises}>
              e mais {planDay.restActivities.length - 3} atividades
            </Text>
          )}
        </View>
      )}
      {!!references.length && day.status === 'READY' && (
        <View style={styles.references}>
          <Text style={styles.referenceTitle}>referência · {formatReferenceDate(references[0].scheduledDate)}</Text>
          <Text style={styles.reference}>
            {references[0].exerciseName}: {formatLoad(references[0].load)} kg
            {references.length > 1 ? ` · +${references.length - 1} exercícios` : ''}
          </Text>
        </View>
      )}
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  )
}

function statusCopy(day: WeeklyTrainingDayOverview, session: WorkoutSession | null) {
  switch (day.status) {
    case 'READY':
      return day.exerciseCount ? 'Tudo pronto para o treino de hoje.' : 'Este treino ainda não possui exercícios.'
    case 'REST': return 'Descanso planejado'
    case 'COMPLETED':
      return `Treino concluído${session ? ` · ${session.completedSets} séries${session.totalVolume > 0 ? ` · ${Math.round(session.totalVolume)} kg` : ''}` : ''}`
    case 'ACTIVE': return 'Sessão em andamento'
    case 'PAUSED': return 'Sessão pausada'
    case 'MISSED': return 'Treino não registrado'
    case 'ABANDONED': return 'Sessão não concluída'
    case 'SCHEDULED': return 'Treino programado'
    default: return 'Dia não configurado'
  }
}

function statusLabel(status: WeeklyTrainingDayOverview['status']) {
  return {
    COMPLETED: 'Concluído',
    ACTIVE: 'Em andamento',
    PAUSED: 'Pausado',
    READY: 'Hoje',
    SCHEDULED: 'Programado',
    REST: 'Descanso',
    MISSED: 'Não registrado',
    ABANDONED: 'Não concluído',
    UNCONFIGURED: 'Não configurado',
  }[status]
}

function actionFor(
  day: WeeklyTrainingDayOverview,
  blocked: boolean,
  callbacks: {
    onStart: () => void
    onConfigure: () => void
    onContinue: () => void
    onOpenPlan: () => void
  },
) {
  if (day.status === 'ACTIVE') return { label: 'Continuar', onPress: callbacks.onContinue }
  if (day.status === 'PAUSED') return { label: 'Retomar', onPress: callbacks.onContinue }
  if (day.status === 'READY' && !day.exerciseCount) {
    return { label: 'Configurar treino', onPress: callbacks.onConfigure }
  }
  if (day.status === 'READY' && !blocked) {
    return { label: 'Iniciar treino', onPress: callbacks.onStart }
  }
  if (day.status === 'REST') return { label: 'Ver ficha', onPress: callbacks.onOpenPlan }
  if (['COMPLETED', 'MISSED', 'ABANDONED', 'SCHEDULED', 'UNCONFIGURED'].includes(day.status)) {
    return { label: 'Abrir ficha', onPress: callbacks.onOpenPlan }
  }
  return null
}

function formatLoad(load: number) {
  return Number.isInteger(load) ? String(load) : load.toLocaleString('pt-BR')
}

function formatReferenceDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replaceAll('.', '')
    .toLocaleLowerCase('pt-BR')
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { marginBottom: 24 },
  eyebrow: { ...typography.monoLabel, color: colors.t2 },
  title: { ...typography.title, color: colors.tx, marginTop: 8 },
  status: { ...typography.body, color: colors.tx, marginTop: 12 },
  exerciseList: { marginTop: 16 },
  exerciseRow: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 40, paddingVertical: 8 },
  exerciseName: { ...typography.body, color: colors.tx, flex: 1 },
  exercisePrescription: { ...typography.numberSmall, color: colors.t2, textAlign: 'right' },
  moreExercises: { ...typography.bodySmall, color: colors.t2, marginTop: 8 },
  meta: { ...typography.bodySmall, color: colors.t2, marginTop: 8 },
  references: { borderTopColor: colors.bd, borderTopWidth: 1, gap: 4, marginTop: 16, paddingTop: 12 },
  referenceTitle: { ...typography.monoLabel, color: colors.t2 },
  reference: { ...typography.bodySmall, color: colors.tx },
  action: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 56, paddingHorizontal: 18 },
  actionText: { ...typography.titleSmall, color: colors.on },
  pressed: { backgroundColor: colors.primaryPressed },
})

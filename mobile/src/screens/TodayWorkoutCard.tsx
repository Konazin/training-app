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
      <Text style={styles.eyebrow}>TREINO DE HOJE</Text>
      <Text style={styles.title}>{day.title}</Text>
      <Text style={styles.plan}>{plan.name}</Text>
      <Text style={styles.status}>{statusCopy(day, session)}</Text>
      {day.status === 'READY' && day.exerciseCount > 0 && (
        <Text style={styles.meta}>
          {day.exerciseCount} {day.exerciseCount === 1 ? 'exercício' : 'exercícios'}
          {' · '}{day.plannedSets} séries
          {day.estimatedDurationMinutes > 0 ? ` · ${day.estimatedDurationMinutes} min` : ''}
        </Text>
      )}
      {day.status === 'REST' && !!planDay?.restActivities.length && (
        <View style={styles.list}>
          {planDay.restActivities.slice(0, 3).map((activity) => (
            <Text key={activity.id} style={styles.listItem}>• {activity.name}</Text>
          ))}
        </View>
      )}
      {!!references.length && day.status === 'READY' && (
        <View style={styles.references}>
          <Text style={styles.referenceTitle}>Referência anterior</Text>
          {references.map((reference) => (
            <Text key={reference.exerciseDefinitionId} style={styles.reference}>
              {reference.exerciseName}: {formatLoad(reference.load)} kg
            </Text>
          ))}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 16, padding: 20 },
  eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', lineHeight: 32, marginTop: 14 },
  plan: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  status: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginTop: 18 },
  meta: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 6 },
  list: { gap: 5, marginTop: 10 },
  listItem: { ...typography.bodySmall, color: colors.textSecondary },
  references: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, gap: 4, marginTop: 16, padding: 12 },
  referenceTitle: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase' },
  reference: { ...typography.bodySmall, color: colors.textPrimary },
  action: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginTop: 20, minHeight: 48, paddingHorizontal: 18 },
  actionText: { ...typography.label, color: colors.onPrimary, fontWeight: '900' },
  pressed: { opacity: 0.72 },
})

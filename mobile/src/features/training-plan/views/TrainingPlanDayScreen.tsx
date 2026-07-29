import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'

const labels = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
} as const

export function TrainingPlanDayScreen({
  plans,
  busyKeys,
  errors,
  onUpdateDay,
  onRemoveExercise,
  onReorderExercises,
  onRemoveActivity,
  onReorderActivities,
  onStart,
}: {
  plans: TrainingPlan[]
  busyKeys: Set<string>
  errors: Record<string, string>
  onUpdateDay: (planId: number, dayId: number, input: {
    title: string
    description: string
    restDay: boolean
    estimatedDurationMinutes: number
    notes: string
  }) => Promise<boolean>
  onRemoveExercise: (planId: number, dayId: number, exerciseId: number) => Promise<boolean>
  onReorderExercises: (planId: number, dayId: number, ids: number[]) => Promise<boolean>
  onRemoveActivity: (planId: number, dayId: number, activityId: number) => Promise<boolean>
  onReorderActivities: (planId: number, dayId: number, ids: number[]) => Promise<boolean>
  onStart: (planId: number, dayId: number) => Promise<boolean>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'TrainingPlanDay'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params.planId)
  const day = plan?.days.find((item) => item.id === route.params.dayId)
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [title, setTitle] = useState(day?.title ?? '')
  const [description, setDescription] = useState(day?.description ?? '')
  const [duration, setDuration] = useState(String(day?.estimatedDurationMinutes ?? 0))
  const [notes, setNotes] = useState(day?.notes ?? '')
  const [restDay, setRestDay] = useState(day?.restDay ?? false)
  const form = {
    title,
    description,
    restDay,
    estimatedDurationMinutes: Number(duration) || 0,
    notes,
  }
  const { dirty, commit } = useUnsavedChangesGuard(form)

  if (!plan || !day) {
    return <Screen><View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View></Screen>
  }

  const planId = plan.id
  const dayId = day.id
  const exercises = day.exercises
  const restActivities = day.restActivities
  const dayKey = `day:update:${day.id}`

  async function moveExercise(index: number, delta: number) {
    const ids = exercises.map((item) => item.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    await onReorderExercises(planId, dayId, ids)
  }

  async function moveActivity(index: number, delta: number) {
    const ids = restActivities.map((item) => item.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    await onReorderActivities(planId, dayId, ids)
  }

  async function save() {
    if (await onUpdateDay(planId, dayId, form)) commit(form)
  }

  return (
    <ScreenScrollView>
      <ScreenHeader
        eyebrow={plan.name}
        title={labels[day.weekday]}
        description="Configuração deste dia da ficha."
      />
      <View style={styles.form}>
        <FormField label="Título" value={title} onChangeText={setTitle} />
        <FormField label="Descrição" value={description} onChangeText={setDescription} multiline />
        <FormField
          label="Duração estimada (min)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <FormField label="Observações" value={notes} onChangeText={setNotes} multiline />
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: restDay }} style={styles.checkboxRow} onPress={() => setRestDay((current) => !current)}>
          <View style={[styles.checkbox, restDay && styles.checkboxActive]}>
            <Text style={styles.checkboxText}>{restDay ? '✓' : ''}</Text>
          </View>
          <Text style={styles.checkboxLabel}>Marcar como dia de descanso</Text>
        </TouchableOpacity>
        {!!errors[dayKey] && <Text style={styles.error}>{errors[dayKey]}</Text>}
        <PrimaryButton
          label="Salvar dia"
          loading={busyKeys.has(dayKey)}
          onPress={() => void save()}
        />
      </View>

      {restDay ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Atividades opcionais</Text>
            <TouchableOpacity
              accessibilityLabel="Adicionar atividade"
              accessibilityRole="button"
              style={styles.add}
              onPress={() => navigation.navigate('RestActivityEditor', {
                planId: plan.id,
                dayId: day.id,
              })}
            >
              <Text style={styles.addText}>＋</Text>
            </TouchableOpacity>
          </View>
          {restActivities.map((activity, index) => (
            <View key={activity.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{activity.name}</Text>
                <Text style={styles.meta}>{activity.category} · {activity.estimatedDurationMinutes} min</Text>
              </View>
              <OrderButtons
                up={index > 0}
                down={index < restActivities.length - 1}
                busy={busyKeys.has(`day:activity:reorder:${dayId}`)}
                onUp={() => void moveActivity(index, -1)}
                onDown={() => void moveActivity(index, 1)}
              />
              <TouchableOpacity accessibilityRole="button" style={styles.itemAction}
                onPress={() => navigation.navigate('RestActivityEditor', {
                  planId: plan.id,
                  dayId: day.id,
                  activityId: activity.id,
                })}
              >
                <Text style={styles.link}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel={`Remover ${activity.name}`} accessibilityRole="button" style={styles.itemAction}
                disabled={busyKeys.has(`activity:remove:${activity.id}`)}
                onPress={() => Alert.alert(
                  'Remover atividade?',
                  `“${activity.name}” será removida e esta ação não poderá ser desfeita.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Remover',
                      style: 'destructive',
                      onPress: () => void onRemoveActivity(planId, dayId, activity.id),
                    },
                  ],
                )}
              >
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
              {!!errors[`activity:remove:${activity.id}`] && (
                <Text style={styles.rowError}>{errors[`activity:remove:${activity.id}`]}</Text>
              )}
            </View>
          ))}
          {!!errors[`day:activity:reorder:${dayId}`] && (
            <Text style={styles.error}>{errors[`day:activity:reorder:${dayId}`]}</Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercícios configurados</Text>
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{exercise.exercise.name}</Text>
                  <Text style={styles.meta}>
                    {exercise.sets} séries · {exercise.minReps}–{exercise.maxReps} reps
                  </Text>
                </View>
                <OrderButtons
                  up={index > 0}
                  down={index < exercises.length - 1}
                  busy={busyKeys.has(`day:exercise:reorder:${dayId}`)}
                  onUp={() => void moveExercise(index, -1)}
                  onDown={() => void moveExercise(index, 1)}
                />
                <TouchableOpacity accessibilityRole="button" style={styles.itemAction}
                  onPress={() => navigation.navigate('DayExerciseEditor', {
                    planId: plan.id,
                    dayId: day.id,
                    exerciseId: exercise.id,
                  })}
                >
                  <Text style={styles.link}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={`Remover ${exercise.exercise.name}`} accessibilityRole="button" style={styles.itemAction}
                  disabled={busyKeys.has(`exercise:remove:${exercise.id}`)}
                  onPress={() => Alert.alert(
                    'Remover exercício?',
                    exercise.exercise.name,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () => void onRemoveExercise(plan.id, day.id, exercise.id),
                      },
                    ],
                  )}
                >
                  <Text style={styles.remove}>×</Text>
                </TouchableOpacity>
                {!!errors[`exercise:remove:${exercise.id}`] && (
                  <Text style={styles.rowError}>{errors[`exercise:remove:${exercise.id}`]}</Text>
                )}
              </View>
            ))}
            {!!errors[`day:exercise:reorder:${dayId}`] && (
              <Text style={styles.error}>{errors[`day:exercise:reorder:${dayId}`]}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adicionar da biblioteca</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.libraryItem}
              onPress={() => navigation.navigate('ExercisePicker', { planId, dayId })}
            >
              <Text style={styles.itemTitle}>Buscar exercício</Text>
              <Text style={styles.link}>Abrir biblioteca →</Text>
            </TouchableOpacity>
          </View>
          {!!exercises.length && !day.restDay && !dirty && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.start}
              onPress={() => void onStart(plan.id, day.id)}
            >
              <Text style={styles.startText}>Iniciar este treino</Text>
            </TouchableOpacity>
          )}
          {!!exercises.length && !day.restDay && dirty && (
            <Text style={styles.saveHint}>Salve as alterações antes de iniciar o treino.</Text>
          )}
        </>
      )}
    </ScreenScrollView>
  )
}

function OrderButtons({
  up,
  down,
  busy,
  onUp,
  onDown,
}: {
  up: boolean
  down: boolean
  busy: boolean
  onUp: () => void
  onDown: () => void
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity accessibilityLabel="Mover para cima" accessibilityRole="button" disabled={!up || busy} onPress={onUp} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 }}><Text style={{ opacity: up && !busy ? 1 : 0.2 }}>↑</Text></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Mover para baixo" accessibilityRole="button" disabled={!down || busy} onPress={onDown} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 }}><Text style={{ opacity: down && !busy ? 1 : 0.2 }}>↓</Text></TouchableOpacity>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 12, padding: 16 },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 14, minHeight: 48 },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  checkboxLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 12, padding: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 10 },
  add: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, height: 48, justifyContent: 'center', width: 48 },
  addText: { color: colors.onPrimary, fontSize: 17 },
  item: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 72 },
  libraryItem: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', minHeight: 64 },
  itemTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  itemAction: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  remove: { color: colors.danger, fontSize: 20 },
  rowError: { color: colors.danger, fontSize: 12, lineHeight: 16, width: '100%' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  start: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, minHeight: 56, justifyContent: 'center' },
  startText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  saveHint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})

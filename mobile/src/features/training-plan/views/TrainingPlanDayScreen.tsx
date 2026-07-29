import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
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
    return <View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View>
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
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setRestDay((current) => !current)}>
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
              <TouchableOpacity
                onPress={() => navigation.navigate('RestActivityEditor', {
                  planId: plan.id,
                  dayId: day.id,
                  activityId: activity.id,
                })}
              >
                <Text style={styles.link}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                <TouchableOpacity
                  onPress={() => navigation.navigate('DayExerciseEditor', {
                    planId: plan.id,
                    dayId: day.id,
                    exerciseId: exercise.id,
                  })}
                >
                  <Text style={styles.link}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
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
              style={styles.libraryItem}
              onPress={() => navigation.navigate('ExercisePicker', { planId, dayId })}
            >
              <Text style={styles.itemTitle}>Buscar exercício</Text>
              <Text style={styles.link}>Abrir biblioteca →</Text>
            </TouchableOpacity>
          </View>
          {!!exercises.length && !day.restDay && !dirty && (
            <TouchableOpacity
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
    </ScrollView>
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
      <TouchableOpacity disabled={!up || busy} onPress={onUp}><Text style={{ opacity: up && !busy ? 1 : 0.2, padding: 6 }}>↑</Text></TouchableOpacity>
      <TouchableOpacity disabled={!down || busy} onPress={onDown}><Text style={{ opacity: down && !busy ? 1 : 0.2, padding: 6 }}>↓</Text></TouchableOpacity>
    </View>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  form: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 12, padding: 14 },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 14 },
  checkbox: { alignItems: 'center', borderColor: colors.gray300, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  checkboxLabel: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  section: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 12, padding: 14 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 10 },
  add: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 11, height: 35, justifyContent: 'center', width: 35 },
  addText: { color: colors.onPrimary, fontSize: 17 },
  item: { alignItems: 'center', borderTopColor: colors.gray100, borderTopWidth: 1, flexDirection: 'row', gap: 6, minHeight: 65 },
  libraryItem: { alignItems: 'center', borderTopColor: colors.gray100, borderTopWidth: 1, flexDirection: 'row', minHeight: 60 },
  itemTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  meta: { color: colors.gray500, fontSize: 8, marginTop: 4 },
  link: { color: colors.ink, fontSize: 8, fontWeight: '800', padding: 6 },
  remove: { color: colors.danger, fontSize: 17, padding: 6 },
  rowError: { color: colors.danger, fontSize: 7, maxWidth: 90 },
  error: { color: colors.danger, fontSize: 9, marginBottom: 8 },
  start: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, minHeight: 52, justifyContent: 'center' },
  startText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  saveHint: { color: colors.gray500, fontSize: 9, textAlign: 'center' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})

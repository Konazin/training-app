import { useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ScreenHeader } from '../../../components/ScreenHeader'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { ExerciseDefinition } from '../../../models/training'
import type {
  DayExerciseConfigInput,
  DayExerciseInput,
  SetType,
  TrainingPlan,
} from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import { ExercisePicker } from './ExercisePicker'

const setTypes: SetType[] = [
  'NORMAL',
  'WARM_UP',
  'DROP_SET',
  'BI_SET',
  'CIRCUIT',
  'TO_FAILURE',
  'CONTROLLED_TEMPO',
]

export function DayExerciseEditorScreen({
  plans,
  library,
  busyKeys,
  errors,
  onCreate,
  onUpdate,
}: {
  plans: TrainingPlan[]
  library: ExerciseDefinition[]
  busyKeys: Set<string>
  errors: Record<string, string>
  onCreate: (planId: number, dayId: number, input: DayExerciseInput) => Promise<boolean>
  onUpdate: (
    planId: number,
    dayId: number,
    exerciseId: number,
    input: DayExerciseConfigInput,
  ) => Promise<boolean>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'DayExerciseEditor'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params.planId)
  const day = plan?.days.find((item) => item.id === route.params.dayId)
  const configured = day?.exercises.find((item) => item.id === route.params.exerciseId)
  const definition = configured?.exercise
    ?? library.find((item) => item.id === route.params.exerciseDefinitionId)
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [sets, setSets] = useState(String(configured?.sets ?? 3))
  const [minReps, setMinReps] = useState(String(configured?.minReps ?? 8))
  const [maxReps, setMaxReps] = useState(String(configured?.maxReps ?? 12))
  const [load, setLoad] = useState(String(configured?.plannedLoad ?? 0))
  const [duration, setDuration] = useState(String(configured?.plannedDurationSeconds ?? 60))
  const [distance, setDistance] = useState(String(configured?.plannedDistance ?? 0))
  const [rest, setRest] = useState(String(configured?.restSeconds ?? 60))
  const [rpe, setRpe] = useState(configured?.plannedRpe == null ? '' : String(configured.plannedRpe))
  const [setType, setSetType] = useState<SetType>(configured?.setType ?? 'NORMAL')
  const [notes, setNotes] = useState(configured?.notes ?? '')
  const [alternativeId, setAlternativeId] = useState<number | null>(
    configured?.alternativeExerciseId ?? null,
  )
  const [showAlternativePicker, setShowAlternativePicker] = useState(false)
  const [formError, setFormError] = useState('')
  const strength = definition?.category === 'STRENGTH' || definition?.category === 'HYPERTROPHY'
  const cardio = definition?.category === 'CARDIO'
  const durationBased = cardio
    || definition?.timed
    || definition?.category === 'MOBILITY'
    || definition?.category === 'STRETCHING'
  const form: DayExerciseConfigInput = {
    sets: number(sets),
    minReps: strength ? number(minReps) : 0,
    maxReps: strength ? number(maxReps) : 0,
    plannedLoad: strength ? number(load) : 0,
    plannedDurationSeconds: durationBased ? number(duration) : null,
    plannedDistance: cardio ? number(distance) : 0,
    restSeconds: number(rest),
    plannedRpe: rpe ? number(rpe) : null,
    setType,
    notes,
    alternativeExerciseId: alternativeId,
  }
  const { commit } = useUnsavedChangesGuard(form)

  if (!plan || !day || !definition) {
    return <View style={styles.empty}><Text style={styles.title}>Exercício não encontrado</Text></View>
  }

  const planId = plan.id
  const dayId = day.id
  const definitionId = definition.id
  const key = configured ? `exercise:update:${configured.id}` : `day:exercise:add:${day.id}`

  async function save() {
    if (form.sets < 1 || form.maxReps < form.minReps) {
      setFormError('Use ao menos uma série e mantenha a repetição máxima acima da mínima.')
      return
    }
    setFormError('')
    const success = configured
      ? await onUpdate(planId, dayId, configured.id, form)
      : await onCreate(planId, dayId, { ...form, exerciseDefinitionId: definitionId })
    if (success) commit(form, navigation.goBack)
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        eyebrow={configured ? 'Editar exercício do dia' : 'Configurar antes de adicionar'}
        title={definition.name}
        description={`${definition.primaryMuscleGroup} · ${definition.category}`}
      />
      <View style={styles.form}>
        <FormField label="Séries" value={sets} onChangeText={setSets} keyboardType="number-pad" />
        {strength && (
          <>
            <View style={styles.row}>
              <View style={styles.half}>
                <FormField label="Repetições mínimas" value={minReps} onChangeText={setMinReps} keyboardType="number-pad" />
              </View>
              <View style={styles.half}>
                <FormField label="Repetições máximas" value={maxReps} onChangeText={setMaxReps} keyboardType="number-pad" />
              </View>
            </View>
            <FormField label="Carga planejada (kg)" value={load} onChangeText={setLoad} keyboardType="decimal-pad" />
          </>
        )}
        {durationBased && (
          <FormField label="Duração planejada (seg)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        )}
        {cardio && (
          <FormField label="Distância planejada (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
        )}
        <FormField label="Descanso (seg)" value={rest} onChangeText={setRest} keyboardType="number-pad" />
        <FormField label="RPE planejado (1–10)" value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" />
        <FormField label="Observações" value={notes} onChangeText={setNotes} multiline />

        <Text style={styles.label}>TIPO DE SÉRIE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {setTypes.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, setType === item && styles.chipActive]}
              onPress={() => setSetType(item)}
            >
              <Text style={[styles.chipText, setType === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>EXERCÍCIO ALTERNATIVO</Text>
        <View style={styles.alternativeRow}>
          <TouchableOpacity style={styles.alternative} onPress={() => setShowAlternativePicker(true)}>
            <Text style={styles.alternativeText}>
              {library.find((item) => item.id === alternativeId)?.name ?? 'Nenhum'}
            </Text>
          </TouchableOpacity>
          {alternativeId != null && (
            <TouchableOpacity onPress={() => setAlternativeId(null)}>
              <Text style={styles.clear}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>
        {!!(formError || errors[key]) && <Text style={styles.error}>{formError || errors[key]}</Text>}
        <PrimaryButton
          label={configured ? 'Salvar configuração' : 'Adicionar ao dia'}
          loading={busyKeys.has(key)}
          onPress={() => void save()}
        />
      </View>
      <Modal
        animationType="slide"
        visible={showAlternativePicker}
        onRequestClose={() => setShowAlternativePicker(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exercício alternativo</Text>
            <TouchableOpacity onPress={() => setShowAlternativePicker(false)}>
              <Text style={styles.clear}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ExercisePicker
            exercises={library}
            excludedId={definition.id}
            onSelect={(exercise) => {
              setAlternativeId(exercise.id)
              setShowAlternativePicker(false)
            }}
          />
        </View>
      </Modal>
    </ScrollView>
  )
}

function number(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 14 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  label: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7, marginTop: 5 },
  chips: { marginBottom: 14 },
  chip: { backgroundColor: colors.gray100, borderRadius: 12, marginRight: 6, paddingHorizontal: 10, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.gray500, fontSize: 8, fontWeight: '700' },
  chipTextActive: { color: colors.onPrimary },
  alternativeRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 14 },
  alternative: { backgroundColor: colors.gray100, borderRadius: 12, flex: 1, minHeight: 42, justifyContent: 'center', paddingHorizontal: 11 },
  alternativeText: { color: colors.ink, fontSize: 9, fontWeight: '700' },
  clear: { color: colors.ink, fontSize: 9, fontWeight: '800', padding: 8 },
  modal: { flex: 1, paddingTop: 45 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: shared.pagePadding, paddingVertical: 12 },
  modalTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 9, marginBottom: 9 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})

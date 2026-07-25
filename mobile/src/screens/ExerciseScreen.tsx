import { useState } from 'react'
import {
  Alert,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { ScreenHeader } from '../components/ScreenHeader'
import type { CustomStats, ExerciseInput, TrainingPlan, Workout } from '../models/training'
import { colors, shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  workouts: Workout[]
  trainingPlans: TrainingPlan[]
  selectedWorkout: Workout | undefined
  selectedPlan: TrainingPlan | undefined
  destination: 'workout' | 'plan'
  loading: boolean
  onDestinationChange: (destination: 'workout' | 'plan') => void
  onSelectWorkout: (id: number) => void
  onSelectPlan: (id: number) => void
  onCreateWorkoutExercise: (input: ExerciseInput) => Promise<boolean>
  onCreatePlanExercise: (input: ExerciseInput) => Promise<boolean>
  onRemoveWorkoutExercise: (workoutId: number, exerciseId: number) => Promise<boolean>
  onRemovePlanExercise: (planId: number, exerciseId: number) => Promise<boolean>
}

const muscles = ['Peitoral', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core']

export function ExerciseScreen({
  workouts,
  trainingPlans,
  selectedWorkout,
  selectedPlan,
  destination,
  loading,
  onDestinationChange,
  onSelectWorkout,
  onSelectPlan,
  onCreateWorkoutExercise,
  onCreatePlanExercise,
  onRemoveWorkoutExercise,
  onRemovePlanExercise,
}: Props) {
  styles = createStyles(useTheme().colors)
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weightKg, setWeightKg] = useState('0')
  const [restSeconds, setRestSeconds] = useState('60')
  const [customStats, setCustomStats] = useState('{\n  "rir": 2\n}')
  const [formError, setFormError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const selectedTarget = destination === 'workout' ? selectedWorkout : selectedPlan
  const destinations = destination === 'workout' ? workouts : trainingPlans

  async function submit() {
    if (!selectedTarget) {
      setFormError(`Selecione uma ${destination === 'workout' ? 'sessão' : 'ficha'}.`)
      return
    }
    if (!name.trim() || !muscleGroup.trim()) {
      setFormError('Preencha o exercício e o grupo muscular.')
      return
    }
    try {
      const stats = parseStats(customStats)
      setFormError('')
      const payload: ExerciseInput = {
        name,
        muscleGroup,
        sets: Number(sets),
        reps: Number(reps),
        weightKg: Number(weightKg.replace(',', '.')),
        restSeconds: Number(restSeconds),
        customStats: stats,
      }
      const success = destination === 'workout'
        ? await onCreateWorkoutExercise(payload)
        : await onCreatePlanExercise(payload)
      if (success) {
        setName('')
        setMuscleGroup('')
      }
    } catch {
      setFormError('Use um objeto JSON válido nas estatísticas.')
    }
  }

  function confirmRemoval(exerciseId: number, exerciseName: string) {
    if (!selectedTarget) return
    Alert.alert('Remover exercício', `Deseja remover “${exerciseName}” desta ${destination === 'workout' ? 'sessão' : 'ficha'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => void (destination === 'workout'
          ? onRemoveWorkoutExercise(selectedTarget.id, exerciseId)
          : onRemovePlanExercise(selectedTarget.id, exerciseId)),
      },
    ])
  }

  function toggleAdvanced() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowAdvanced((value) => !value)
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Montagem de treino"
        title={'Adicionar\nexercício'}
        description="Registre em uma sessão ou guarde em uma ficha reutilizável."
      />

      <View style={styles.destinationSwitch}>
        <TouchableOpacity
          style={[styles.destinationButton, destination === 'workout' && styles.destinationButtonActive]}
          onPress={() => onDestinationChange('workout')}
        >
          <Text style={[styles.destinationText, destination === 'workout' && styles.destinationTextActive]}>
            Sessão atual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.destinationButton, destination === 'plan' && styles.destinationButtonActive]}
          onPress={() => onDestinationChange('plan')}
        >
          <Text style={[styles.destinationText, destination === 'plan' && styles.destinationTextActive]}>
            Ficha de treino
          </Text>
        </TouchableOpacity>
      </View>

      {!destinations.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>⌁</Text></View>
          <Text style={styles.emptyTitle}>Primeiro, crie {destination === 'workout' ? 'um treino' : 'uma ficha'}</Text>
          <Text style={styles.emptyText}>O exercício precisa de um destino para manter sua rotina organizada.</Text>
        </View>
      ) : (
        <>
          <StepHeader number="1" title={`Escolha ${destination === 'workout' ? 'a sessão' : 'a ficha'}`} description="Onde este exercício será registrado?" />
          <ScrollView
            horizontal
            contentContainerStyle={styles.workoutSelector}
            showsHorizontalScrollIndicator={false}
            style={styles.workoutSelectorScroll}
          >
            {destinations.map((target) => {
              const active = selectedTarget?.id === target.id
              return (
                <Pressable
                  key={target.id}
                  onPress={() => destination === 'workout' ? onSelectWorkout(target.id) : onSelectPlan(target.id)}
                  style={({ pressed }) => [
                    styles.workoutOption,
                    active && styles.workoutOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.workoutOptionTop}>
                    <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                      <Text style={[styles.optionIconText, active && styles.optionTextActive]}>{active ? '✓' : '▦'}</Text>
                    </View>
                    <Text style={[styles.optionCount, active && styles.optionMutedActive]}>
                      {target.exercises.length} exercícios
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.workoutOptionText, active && styles.optionTextActive]}>
                    {target.name}
                  </Text>
                  <Text style={[styles.workoutOptionDate, active && styles.optionMutedActive]}>
                    {'scheduledDate' in target
                      ? target.scheduledDate.split('-').reverse().join('/')
                      : `${target.category} · ${target.difficulty}`}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <StepHeader number="2" title={destination === 'workout' ? 'Registre a execução' : 'Defina o exercício'} description="Os campos mais usados vêm primeiro." />
          <View style={styles.formCard}>
            <FormField label="Nome do exercício" value={name} onChangeText={setName} placeholder="Ex.: Remada baixa" />
            <FormField label="Grupo muscular" value={muscleGroup} onChangeText={setMuscleGroup} placeholder="Ex.: Costas" />

            <ScrollView
              horizontal
              contentContainerStyle={styles.muscleChips}
              showsHorizontalScrollIndicator={false}
              style={styles.muscleScroll}
            >
              {muscles.map((muscle) => (
                <TouchableOpacity
                  key={muscle}
                  activeOpacity={0.75}
                  style={[styles.muscleChip, muscleGroup === muscle && styles.muscleChipActive]}
                  onPress={() => setMuscleGroup(muscle)}
                >
                  <Text style={[styles.muscleChipText, muscleGroup === muscle && styles.muscleChipTextActive]}>
                    {muscle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.tripleField}>
              <NumericField label="Séries" value={sets} onChange={setSets} keyboard="number-pad" />
              <NumericField label="Reps" value={reps} onChange={setReps} keyboard="number-pad" />
              <NumericField label="Carga kg" value={weightKg} onChange={setWeightKg} keyboard="decimal-pad" />
            </View>

            <TouchableOpacity activeOpacity={0.75} style={styles.advancedButton} onPress={toggleAdvanced}>
              <View>
                <Text style={styles.advancedTitle}>Ajustes avançados</Text>
                <Text style={styles.advancedDescription}>Descanso e estatísticas personalizadas</Text>
              </View>
              <Text style={styles.advancedSymbol}>{showAdvanced ? '−' : '+'}</Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedPanel}>
                <FormField
                  label="Descanso entre séries (seg)"
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="number-pad"
                />
                <FormField
                  label="Estatísticas personalizadas (JSON)"
                  value={customStats}
                  onChangeText={setCustomStats}
                  autoCapitalize="none"
                  multiline
                />
              </View>
            )}
            {!!formError && <Text style={styles.error}>{formError}</Text>}
            <PrimaryButton label={`＋  Adicionar à ${destination === 'workout' ? 'sessão' : 'ficha'}`} loading={loading} onPress={() => void submit()} />
          </View>

          <View style={styles.reviewHeader}>
            <StepHeader number="3" title={`Revise ${destination === 'workout' ? 'a sessão' : 'a ficha'}`} description="Confira a ordem e os números." />
          </View>
          <View style={styles.seriesCard}>
            <View style={styles.seriesHeading}>
              <View>
                <Text style={styles.seriesEyebrow}>{destination === 'workout' ? 'SESSÃO ATUAL' : 'FICHA SELECIONADA'}</Text>
                <Text numberOfLines={1} style={styles.seriesName}>{selectedTarget?.name ?? 'Selecione um destino'}</Text>
              </View>
              <View style={styles.seriesCount}>
                <Text style={styles.seriesCountText}>{selectedTarget?.exercises.length ?? 0}</Text>
              </View>
            </View>

            {!selectedTarget?.exercises.length ? (
              <View style={styles.noExercises}>
                <View style={styles.noExercisesIcon}><Text style={styles.noExercisesIconText}>＋</Text></View>
                <Text style={styles.noExercisesTitle}>{destination === 'workout' ? 'A sessão' : 'A ficha'} está vazia</Text>
                <Text style={styles.noExercisesText}>O próximo exercício aparecerá aqui.</Text>
              </View>
            ) : (
              <>
                {selectedTarget.exercises.map((exercise, index) => (
                  <View key={exercise.id} style={[styles.exerciseRow, index > 0 && styles.exerciseBorder]}>
                    <View style={styles.exerciseIndex}>
                      <Text style={styles.exerciseIndexText}>{String(index + 1).padStart(2, '0')}</Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text numberOfLines={1} style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {exercise.sets} séries · {exercise.reps} reps · {exercise.weightKg} kg
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.removeButton} onPress={() => confirmRemoval(exercise.id, exercise.name)}>
                      <Text style={styles.remove}>⌫</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.seriesSummary}>
                  <SummaryItem
                    value={selectedTarget.exercises.reduce((sum, item) => sum + item.sets, 0)}
                    label="séries"
                  />
                  <View style={styles.summaryDivider} />
                  <SummaryItem value={selectedTarget.exercises.reduce((sum, item) => sum + item.sets * item.reps, 0)} label="repetições" />
                  <View style={styles.summaryDivider} />
                  <SummaryItem value={selectedTarget.exercises.reduce((sum, item) => sum + item.restSeconds, 0)} label="seg descanso" />
                </View>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function StepHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  )
}

function NumericField({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  keyboard: 'number-pad' | 'decimal-pad'
}) {
  return (
    <View style={styles.numericField}>
      <FormField
        label={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={styles.numericInput}
      />
    </View>
  )
}

function SummaryItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function parseStats(value: string): CustomStats {
  const parsed = JSON.parse(value || '{}') as unknown
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
  return parsed as CustomStats
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    padding: shared.pagePadding,
    paddingBottom: 124,
  },
  destinationSwitch: {
    backgroundColor: colors.gray100,
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 22,
    padding: 4,
  },
  destinationButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  destinationButtonActive: {
    backgroundColor: colors.card,
  },
  destinationText: {
    color: colors.gray500,
    fontSize: 10,
    fontWeight: '700',
  },
  destinationTextActive: {
    color: colors.ink,
  },
  stepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: 99,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  stepDescription: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 2,
  },
  workoutSelectorScroll: {
    marginHorizontal: -shared.pagePadding,
    marginBottom: 21,
  },
  workoutSelector: {
    gap: 9,
    paddingHorizontal: shared.pagePadding,
  },
  workoutOption: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 126,
    padding: 14,
    width: 210,
  },
  workoutOptionActive: {
    backgroundColor: colors.nearBlack,
    borderColor: colors.nearBlack,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  workoutOptionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionIconActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  optionIconText: {
    color: colors.gray500,
    fontSize: 14,
  },
  optionCount: {
    color: colors.gray400,
    fontSize: 8,
  },
  workoutOptionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 13,
  },
  workoutOptionDate: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 5,
  },
  optionTextActive: {
    color: colors.white,
  },
  optionMutedActive: {
    color: colors.gray500,
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 15,
  },
  muscleScroll: {
    marginHorizontal: -15,
    marginBottom: 14,
    marginTop: -2,
  },
  muscleChips: {
    gap: 7,
    paddingHorizontal: 15,
  },
  muscleChip: {
    borderColor: colors.gray200,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  muscleChipActive: {
    backgroundColor: colors.nearBlack,
    borderColor: colors.nearBlack,
  },
  muscleChipText: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
  },
  muscleChipTextActive: {
    color: colors.white,
  },
  tripleField: {
    flexDirection: 'row',
    gap: 7,
  },
  numericField: {
    flex: 1,
  },
  numericInput: {
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  advancedButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 64,
    paddingHorizontal: 15,
  },
  advancedTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  advancedDescription: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 4,
  },
  advancedSymbol: {
    color: colors.gray500,
    fontSize: 21,
    fontWeight: '300',
  },
  advancedPanel: {
    backgroundColor: colors.background,
    borderRadius: 17,
    marginBottom: 14,
    padding: 13,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 12,
    padding: 11,
  },
  reviewHeader: {
    marginTop: 25,
  },
  seriesCard: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seriesHeading: {
    alignItems: 'center',
    borderBottomColor: colors.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  seriesEyebrow: {
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  seriesName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    maxWidth: 260,
  },
  seriesCount: {
    backgroundColor: colors.gray100,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seriesCountText: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
  },
  noExercises: {
    alignItems: 'center',
    minHeight: 175,
    padding: 25,
  },
  noExercisesIcon: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 15,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  noExercisesIconText: {
    color: colors.gray400,
    fontSize: 18,
  },
  noExercisesTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 11,
  },
  noExercisesText: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 4,
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 15,
    minHeight: 68,
  },
  exerciseBorder: {
    borderTopColor: colors.gray100,
    borderTopWidth: 1,
  },
  exerciseIndex: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  exerciseIndexText: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
  },
  exerciseDetails: {
    flex: 1,
    marginLeft: 11,
  },
  exerciseName: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: colors.gray400,
    fontSize: 9,
    marginTop: 4,
  },
  removeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  remove: {
    color: colors.gray300,
    fontSize: 16,
  },
  seriesSummary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.gray100,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  summaryLabel: {
    color: colors.gray400,
    fontSize: 8,
    marginTop: 2,
  },
  summaryDivider: {
    backgroundColor: colors.gray200,
    height: 22,
    width: 1,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 310,
    padding: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 20,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  emptyIconText: {
    color: colors.gray500,
    fontSize: 22,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
  },
  emptyText: {
    color: colors.gray500,
    fontSize: 11,
    marginTop: 7,
    textAlign: 'center',
  },
})

let styles = createStyles(colors)

import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
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
import { StatusPill } from '../components/StatusPill'
import type { CustomStats, Workout, WorkoutInput, WorkoutStatus } from '../models/training'
import { colors, shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  workouts: Workout[]
  loading: boolean
  onCreate: (input: WorkoutInput) => Promise<boolean>
  onRemove: (id: number) => Promise<boolean>
  onAddExercise: (workoutId: number) => void
}

type Filter = 'ALL' | WorkoutStatus

const statuses: { value: WorkoutStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Planejado' },
  { value: 'IN_PROGRESS', label: 'Em curso' },
  { value: 'COMPLETED', label: 'Concluído' },
]

const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PLANNED', label: 'Planejados' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluídos' },
]

export function WorkoutsScreen({ workouts, loading, onCreate, onRemove, onAddExercise }: Props) {
  styles = createStyles(useTheme().colors)
  const [showForm, setShowForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<WorkoutStatus>('PLANNED')
  const [duration, setDuration] = useState('45')
  const [calories, setCalories] = useState('0')
  const [customStats, setCustomStats] = useState('{\n  "intensidade": "moderada"\n}')

  const filtered = useMemo(
    () => filter === 'ALL' ? workouts : workouts.filter((item) => item.status === filter),
    [filter, workouts],
  )

  async function submit() {
    if (!name.trim() || !date) {
      setFormError('Preencha o nome e a data do treino.')
      return
    }
    try {
      const parsed = parseStats(customStats)
      setFormError('')
      const success = await onCreate({
        name,
        description,
        scheduledDate: date,
        status,
        durationMinutes: Number(duration),
        calories: Number(calories),
        customStats: parsed,
      })
      if (success) {
        setName('')
        setDescription('')
        setShowAdvanced(false)
        setShowForm(false)
      }
    } catch {
      setFormError('Use um objeto JSON válido nas estatísticas.')
    }
  }

  function confirmRemoval(workout: Workout) {
    Alert.alert('Remover treino', `Deseja remover “${workout.name}”? Esta ação não poderá ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void onRemove(workout.id) },
    ])
  }

  function toggleAdvanced() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowAdvanced((value) => !value)
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Planejamento"
          title="Seus treinos"
          description="Organize a semana e mantenha cada sessão pronta para começar."
          action={(
            <TouchableOpacity activeOpacity={0.75} style={styles.headerAdd} onPress={() => setShowForm(true)}>
              <Text style={styles.headerAddSymbol}>＋</Text>
            </TouchableOpacity>
          )}
        />

        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((item) => {
            const active = filter === item.value
            const count = item.value === 'ALL'
              ? workouts.length
              : workouts.filter((workout) => workout.status === item.value).length
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.75}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => setFilter(item.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {!filtered.length && !loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>▤</Text>
            </View>
            <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
            <Text style={styles.emptyText}>
              {filter === 'ALL' ? 'Crie seu primeiro treino e comece a construir sua rotina.' : 'Nenhum treino corresponde a este filtro.'}
            </Text>
            {filter === 'ALL' && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowForm(true)}>
                <Text style={styles.emptyButtonText}>Criar primeiro treino</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutIcon}>
                  <Text style={styles.workoutIconText}>⌁</Text>
                </View>
                <View style={styles.workoutHeading}>
                  <Text style={styles.workoutDate}>{formatDate(workout.scheduledDate)}</Text>
                  <Text numberOfLines={1} style={styles.workoutName}>{workout.name}</Text>
                </View>
                <StatusPill status={workout.status} />
              </View>

              <Text numberOfLines={2} style={styles.description}>
                {workout.description || 'Sem observações para esta sessão.'}
              </Text>

              <View style={styles.metrics}>
                <CardMetric value={workout.durationMinutes} label="minutos" />
                <View style={styles.metricDivider} />
                <CardMetric value={workout.exercises.length} label="exercícios" />
                <View style={styles.metricDivider} />
                <CardMetric value={workout.calories} label="kcal" />
              </View>

              {!!workout.exercises.length && (
                <View style={styles.preview}>
                  {workout.exercises.slice(0, 2).map((exercise, index) => (
                    <View key={exercise.id} style={styles.previewRow}>
                      <Text style={styles.previewIndex}>{String(index + 1).padStart(2, '0')}</Text>
                      <Text numberOfLines={1} style={styles.previewName}>{exercise.name}</Text>
                      <Text style={styles.previewMeta}>{exercise.sets} × {exercise.reps}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.exerciseButton}
                  onPress={() => onAddExercise(workout.id)}
                >
                  <Text style={styles.exerciseButtonText}>＋  Adicionar exercício</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeButton} onPress={() => confirmRemoval(workout)}>
                  <Text style={styles.removeButtonText}>⌫</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityLabel="Criar novo treino"
        style={styles.fab}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={showForm}
        statusBarTranslucent
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.modalDismiss} onPress={() => setShowForm(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>NOVO PLANEJAMENTO</Text>
                <Text style={styles.sheetTitle}>Criar treino</Text>
                <Text style={styles.sheetDescription}>Comece pelo essencial. Você pode enriquecer depois.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowForm(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField label="Nome do treino" value={name} onChangeText={setName} placeholder="Ex.: Força — pernas" />
              <FormField
                label="Objetivo ou observações"
                value={description}
                onChangeText={setDescription}
                placeholder="Como você quer conduzir esta sessão?"
                multiline
              />
              <View style={styles.doubleField}>
                <View style={styles.halfField}>
                  <FormField label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
                </View>
                <View style={styles.halfField}>
                  <FormField label="Duração (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
                </View>
              </View>

              <Text style={styles.label}>STATUS INICIAL</Text>
              <View style={styles.segmented}>
                {statuses.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setStatus(item.value)}
                    style={[styles.segment, status === item.value && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, status === item.value && styles.segmentTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TouchableOpacity activeOpacity={0.75} style={styles.advancedButton} onPress={toggleAdvanced}>
                <View>
                  <Text style={styles.advancedTitle}>Métricas avançadas</Text>
                  <Text style={styles.advancedDescription}>Calorias e dados personalizados em JSON</Text>
                </View>
                <Text style={styles.advancedSymbol}>{showAdvanced ? '−' : '+'}</Text>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedPanel}>
                  <FormField label="Calorias estimadas" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
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
              <PrimaryButton label="Salvar treino" loading={loading} onPress={() => void submit()} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

function CardMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function parseStats(value: string): CustomStats {
  const parsed = JSON.parse(value || '{}') as unknown
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
  return parsed as CustomStats
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replace(/\./g, '')
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    padding: shared.pagePadding,
    paddingBottom: 124,
  },
  headerAdd: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    marginBottom: 3,
    width: 48,
  },
  headerAddSymbol: {
    color: colors.white,
    fontSize: 22,
  },
  filterScroll: {
    marginHorizontal: -shared.pagePadding,
    marginBottom: 17,
  },
  filters: {
    gap: 8,
    paddingHorizontal: shared.pagePadding,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  filterActive: {
    backgroundColor: colors.nearBlack,
    borderColor: colors.nearBlack,
  },
  filterText: {
    color: colors.gray500,
    fontSize: 10,
    fontWeight: '800',
  },
  filterTextActive: {
    color: colors.white,
  },
  filterCount: {
    backgroundColor: colors.gray100,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  filterCountText: {
    color: colors.gray500,
    fontSize: 8,
    fontWeight: '800',
  },
  filterCountTextActive: {
    color: colors.white,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 15,
  },
  workoutHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  workoutIcon: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: 15,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  workoutIconText: {
    color: colors.white,
    fontSize: 19,
  },
  workoutHeading: {
    flex: 1,
  },
  workoutDate: {
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  workoutName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  description: {
    color: colors.gray500,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 13,
    minHeight: 34,
  },
  metrics: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 11,
  },
  metric: {
    flex: 1,
    paddingHorizontal: 11,
  },
  metricDivider: {
    backgroundColor: colors.gray200,
    height: 25,
    width: 1,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.gray400,
    fontSize: 8,
    marginTop: 2,
  },
  preview: {
    borderTopColor: colors.gray100,
    borderTopWidth: 1,
    marginTop: 13,
    paddingTop: 8,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 31,
  },
  previewIndex: {
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '800',
    width: 24,
  },
  previewName: {
    color: colors.gray700,
    flex: 1,
    fontSize: 10,
  },
  previewMeta: {
    color: colors.gray400,
    fontSize: 9,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  exerciseButton: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  exerciseButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    justifyContent: 'center',
    minHeight: 48,
    width: 48,
  },
  removeButtonText: {
    color: colors.gray400,
    fontSize: 18,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 300,
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
    lineHeight: 17,
    marginTop: 8,
    maxWidth: 260,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.nearBlack,
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.nearBlack,
    borderRadius: 20,
    bottom: 98,
    elevation: 7,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: 56,
  },
  fabText: {
    color: colors.white,
    fontSize: 24,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 99,
    height: 4,
    marginBottom: 18,
    width: 40,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetEyebrow: {
    color: colors.gray400,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 7,
  },
  sheetDescription: {
    color: colors.gray500,
    fontSize: 10,
    marginTop: 5,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 15,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  closeButtonText: {
    color: colors.gray500,
    fontSize: 23,
    fontWeight: '300',
  },
  form: {
    paddingBottom: 32,
    paddingTop: 22,
  },
  doubleField: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  label: {
    color: colors.gray500,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 7,
  },
  segmented: {
    backgroundColor: colors.gray100,
    borderRadius: 15,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  segmentActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    color: colors.gray400,
    fontSize: 9,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  advancedButton: {
    alignItems: 'center',
    borderColor: colors.gray200,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 18,
    marginTop: 12,
    padding: 14,
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
})

let styles = createStyles(colors)

import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../navigation/types'
import type {
  SessionExercise,
  SessionExerciseStatus,
  SetLog,
  SetLogInput,
  WorkoutSession,
} from '@training/training-domain'
import type { RestTimerState } from '../model/restTimer'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { type ThemeColors, useTheme } from '../../../theme'
import { ExerciseVideo } from '../../exercise-library/ExerciseVideo'
import { attributionLabel, resolveMediaAttribution } from '../../exercise-library/libraryState'
import { ThemedTextInput } from '../../../components/ThemedTextInput'

interface Props {
  session: WorkoutSession | null
  restTimer: RestTimerState | null
  errors: Record<string, string>
  busyKeys: Set<string>
  onUpdateSet: (exerciseId: number, setId: number, input: SetLogInput) => Promise<boolean>
  onAddSet: (exerciseId: number) => Promise<boolean>
  onRemoveSet: (exerciseId: number, setId: number) => Promise<boolean>
  onSetExerciseStatus: (exerciseId: number, status: SessionExerciseStatus) => Promise<boolean>
  onPause: () => Promise<boolean>
  onResume: () => Promise<boolean>
  onComplete: (rpe: number | null, notes: string) => Promise<boolean>
  onAbandon: () => Promise<boolean>
  onStartRest: (exerciseId: number, setId: number, seconds: number) => void
  onAdjustRest: (seconds: number) => void
  onSkipRest: () => void
}

export function WorkoutSessionScreen(props: Props) {
  const {
    session,
    restTimer,
    errors,
    busyKeys,
    onUpdateSet,
    onAddSet,
    onRemoveSet,
    onSetExerciseStatus,
    onPause,
    onResume,
    onComplete,
    onAbandon,
    onStartRest,
    onAdjustRest,
    onSkipRest,
  } = props
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [now, setNow] = useState(Date.now())
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  const [canLeave, setCanLeave] = useState(false)
  const [videoExercise, setVideoExercise] = useState<SessionExercise | null>(null)
  const [videoRetryKey, setVideoRetryKey] = useState(0)
  const notifiedTimer = useRef('')
  const closeVideo = () => {
    setVideoExercise(null)
    setVideoRetryKey(0)
  }
  const openVideo = (exercise: SessionExercise) => {
    setVideoRetryKey(0)
    setVideoExercise(exercise)
  }
  const videoMetadata = videoExercise ? resolveMediaAttribution({
    author: videoExercise.primaryVideoAuthor,
    licenseName: videoExercise.primaryVideoLicenseName,
    licenseUrl: videoExercise.primaryVideoLicenseUrl,
    sourceUrl: videoExercise.primaryVideoSourceUrl,
  }, {}) : null
  const videoAttribution = videoMetadata
    ? (Object.values(videoMetadata).some(Boolean)
      ? attributionLabel(videoMetadata)
      : videoExercise?.attribution || attributionLabel({}))
    : ''

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const remaining = restTimer
    ? Math.max(0, Math.ceil((
      restTimer.endsAt - (restTimer.paused ? restTimer.pausedAt ?? now : now)
    ) / 1000))
    : 0
  const timerKey = restTimer ? `${restTimer.sessionId}:${restTimer.setId}:${restTimer.endsAt}` : ''

  useEffect(() => {
    if (restTimer && !restTimer.paused && remaining === 0 && notifiedTimer.current !== timerKey) {
      notifiedTimer.current = timerKey
      Vibration.vibrate([0, 180, 80, 180])
      onSkipRest()
    }
  }, [onSkipRest, remaining, restTimer, timerKey])

  usePreventRemove(Boolean(session) && !canLeave, ({ data }) => {
    Alert.alert('Sair da sessão?', 'Escolha como deseja deixar o treino.', [
      { text: 'Continuar treinando', style: 'cancel' },
      {
        text: session?.status === 'PAUSED' ? 'Sair pausada' : 'Pausar e sair',
        onPress: () => {
          void (async () => {
            const success = session?.status === 'PAUSED' || await onPause()
            if (!success) return
            setCanLeave(true)
            setTimeout(() => navigation.dispatch(data.action), 0)
          })()
        },
      },
      {
        text: 'Abandonar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!await onAbandon()) return
            setCanLeave(true)
            setTimeout(() => navigation.dispatch(data.action), 0)
          })()
        },
      },
    ])
  })

  if (!session) {
    return (
      <Screen><View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nenhuma sessão ativa</Text>
        <Text style={styles.muted}>Escolha um treino na ficha semanal.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primary}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Plan' })}
        >
          <Text style={styles.primaryText}>Abrir ficha</Text>
        </TouchableOpacity>
      </View></Screen>
    )
  }

  async function completeSession() {
    if (await onComplete(rpe ? toNumber(rpe) : null, notes)) {
      setCanLeave(true)
      setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' }), 0)
    }
  }

  return (<>
    <ScreenScrollView
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sessionHeader, session.status === 'PAUSED' && styles.pausedHeader]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {session.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO'}
          </Text>
          <Text style={styles.title}>{session.workoutName}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busyKeys.has('session') }}
          disabled={busyKeys.has('session')}
          onPress={() => void (session.status === 'PAUSED' ? onResume() : onPause())}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            {session.status === 'PAUSED' ? 'Continuar' : 'Pausar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>PROGRESSO</Text>
          <Text style={styles.metricValue}>
            {session.totalPlannedSets
              ? Math.round(session.completedSets / session.totalPlannedSets * 100)
              : 0}%
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>VOLUME</Text>
          <Text style={styles.metricValue}>{session.totalVolume}kg</Text>
        </View>
      </View>

      {remaining > 0 && (
        <View style={styles.timer}>
          <View>
            <Text style={styles.timerLabel}>DESCANSO</Text>
            <Text style={styles.timerValue}>{formatTime(remaining)}</Text>
          </View>
          <View style={styles.timerActions}>
            <TimerAction label="−15" onPress={() => onAdjustRest(-15)} />
            <TimerAction label="+15" onPress={() => onAdjustRest(15)} />
            <TimerAction label="Pular" onPress={onSkipRest} />
          </View>
        </View>
      )}

      {session.exercises.map((exercise, index) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.index}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.muted}>
                {exercise.category === 'CARDIO' || exercise.timed
                  ? 'Duração'
                  : `${exercise.plannedMinReps}–${exercise.plannedMaxReps} reps`}
                {' · '}{exercise.restSeconds}s descanso
              </Text>
              {!!exercise.primaryVideoUrl && (
                <TouchableOpacity accessibilityLabel={`Ver execução de ${exercise.name}`} accessibilityRole="button" onPress={() => openVideo(exercise)} style={styles.textAction}>
                  <Text style={styles.videoLink}>▶ Ver execução</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: busyKeys.has(`exercise:${exercise.id}`), selected: exercise.status === 'SKIPPED' }}
              disabled={busyKeys.has(`exercise:${exercise.id}`)}
              onPress={() => void onSetExerciseStatus(
                exercise.id,
                exercise.status === 'SKIPPED' ? 'PENDING' : 'SKIPPED',
              )}
            >
              <Text style={styles.skip}>
                {exercise.status === 'SKIPPED' ? 'Desfazer' : 'Pular'}
              </Text>
            </TouchableOpacity>
          </View>

          {exercise.sets.map((set) => (
            <SetEditor
              key={set.id}
              exercise={exercise}
              set={set}
              busy={busyKeys.has(`set:${set.id}`)}
              error={errors[`set:${set.id}`]}
              onSave={(input) => onUpdateSet(exercise.id, set.id, input)}
              onRemove={() => onRemoveSet(exercise.id, set.id)}
              onStartRest={() => onStartRest(exercise.id, set.id, exercise.restSeconds)}
            />
          ))}

          {!!errors[`exercise:${exercise.id}`] && (
            <Text style={styles.error}>{errors[`exercise:${exercise.id}`]}</Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busyKeys.has(`exercise:${exercise.id}`)}
            style={styles.addSet}
            onPress={() => void onAddSet(exercise.id)}
          >
            <Text style={styles.addSetText}>＋ Adicionar série</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.finish}>
        <ThemedTextInput
          accessibilityLabel="RPE geral"
          value={rpe}
          onChangeText={setRpe}
          keyboardType="decimal-pad"
          placeholder="RPE geral (1–10)"
          style={styles.input}
        />
        <ThemedTextInput
          accessibilityLabel="Observações da sessão"
          value={notes}
          onChangeText={setNotes}
          placeholder="Observações da sessão"
          style={styles.input}
        />
        {!!errors.session && <Text style={styles.error}>{errors.session}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busyKeys.has('session')}
          style={styles.primary}
          onPress={() => void completeSession()}
        >
          <Text style={styles.primaryText}>Concluir e salvar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busyKeys.has('session') }}
          disabled={busyKeys.has('session')}
          onPress={() => Alert.alert(
            'Abandonar sessão?',
            'Os registros feitos serão preservados.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abandonar',
                style: 'destructive',
                onPress: () => void (async () => {
                  if (await onAbandon()) {
                    setCanLeave(true)
                    setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' }), 0)
                  }
                })(),
              },
            ],
          )}
        >
          <Text style={styles.abandon}>Abandonar sessão</Text>
        </TouchableOpacity>
      </View>
    </ScreenScrollView>
    {videoExercise && <Modal visible transparent animationType="fade" onRequestClose={closeVideo}>
      <Screen style={styles.videoBackdrop}>
        <View style={styles.videoSheet}>
          <Text style={styles.videoTitle}>{videoExercise.name}</Text>
          {!!videoExercise.primaryVideoUrl && <ExerciseVideo key={videoRetryKey} url={videoExercise.primaryVideoUrl} posterUrl={videoExercise.primaryImageUrl} onRetry={() => setVideoRetryKey((value) => value + 1)} />}
          <Text style={styles.videoAttribution}>{videoAttribution}</Text>
          {!!videoMetadata?.sourceUrl && <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(videoMetadata.sourceUrl!)} style={styles.textAction}><Text style={styles.videoLink}>Abrir fonte original</Text></TouchableOpacity>}
          {!!videoMetadata?.licenseUrl && <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(videoMetadata.licenseUrl!)} style={styles.textAction}><Text style={styles.videoLink}>Consultar licença</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" onPress={closeVideo} style={styles.textAction}><Text style={styles.videoClose}>Fechar</Text></TouchableOpacity>
        </View>
      </Screen>
    </Modal>}
  </>)
}

function SetEditor({
  exercise,
  set,
  busy,
  error,
  onSave,
  onRemove,
  onStartRest,
}: {
  exercise: SessionExercise
  set: SetLog
  busy: boolean
  error?: string
  onSave: (input: SetLogInput) => Promise<boolean>
  onRemove: () => Promise<boolean>
  onStartRest: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [reps, setReps] = useState(String(set.reps))
  const [load, setLoad] = useState(String(set.load))
  const [duration, setDuration] = useState(String(set.durationSeconds))
  const [distance, setDistance] = useState(String(set.distance))
  const [rpe, setRpe] = useState(set.rpe == null ? '' : String(set.rpe))
  const [notes, setNotes] = useState(set.notes)
  const cardio = exercise.category === 'CARDIO'
  const timed = cardio || exercise.timed

  function input(completed: boolean): SetLogInput {
    return {
      reps: toNumber(reps),
      load: toNumber(load),
      durationSeconds: toNumber(duration),
      distance: toNumber(distance),
      rpe: rpe ? toNumber(rpe) : null,
      completed,
      notes,
    }
  }

  async function toggle() {
    const completing = !set.completed
    if (await onSave(input(completing)) && completing) onStartRest()
  }

  return (
    <View style={styles.setEditor}>
      <View style={styles.setTitle}>
        <Text style={styles.setNumber}>SÉRIE {set.setNumber}</Text>
        {set.manuallyAdded && (
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void onRemove()} style={styles.textAction}>
            <Text style={styles.removeSet}>Remover</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fields}>
        {!timed && (
          <>
            <SetField label="REPS" value={reps} onChange={setReps} />
            <SetField label="CARGA KG" value={load} onChange={setLoad} decimal />
          </>
        )}
        {timed && <SetField label="DURAÇÃO S" value={duration} onChange={setDuration} />}
        {cardio && <SetField label="DISTÂNCIA KM" value={distance} onChange={setDistance} decimal />}
        <SetField label="RPE" value={rpe} onChange={setRpe} decimal />
      </View>
      <ThemedTextInput
        accessibilityLabel="Observação da série"
        value={notes}
        onChangeText={setNotes}
        placeholder="Observação opcional"
        style={styles.setNotes}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.setActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          style={styles.saveSet}
          onPress={() => void onSave(input(set.completed))}
        >
          <Text style={styles.saveSetText}>{busy ? 'Salvando…' : 'Salvar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, selected: set.completed }}
          disabled={busy}
          style={[styles.check, set.completed && styles.checked]}
          onPress={() => void toggle()}
        >
          <Text style={[styles.checkText, set.completed && styles.checkedText]}>
            {set.completed ? '✓ Concluída' : '○ Concluir'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function SetField({
  label,
  value,
  onChange,
  decimal = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  decimal?: boolean
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <View style={styles.field}>
      <Text style={styles.setLabel}>{label}</Text>
      <ThemedTextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        style={styles.setInput}
      />
    </View>
  )
}

function TimerAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.timerAction}>
      <Text style={[timerActionStyle, { color: colors.background }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function toNumber(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function formatTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

const timerActionStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sessionHeader: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 12, marginBottom: 12, padding: 12 },
  pausedHeader: { backgroundColor: colors.surfaceSecondary, borderColor: colors.warning, borderWidth: 1 },
  eyebrow: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '700', letterSpacing: -1, lineHeight: 37, marginTop: 7 },
  metrics: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, padding: 16 },
  metricLabel: { color: colors.gray400, fontSize: 12 },
  metricValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 6 },
  timer: { alignItems: 'center', backgroundColor: colors.textPrimary, borderRadius: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 12, padding: 18 },
  timerLabel: { color: colors.background, fontSize: 14, fontWeight: '800' },
  timerValue: { color: colors.background, fontSize: 36, fontWeight: '700', lineHeight: 43, marginTop: 3 },
  timerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerAction: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 21, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 16 },
  index: { backgroundColor: colors.primary, borderRadius: 13, color: colors.onPrimary, fontSize: 16, fontWeight: '800', minWidth: 48, overflow: 'hidden', padding: 14, textAlign: 'center' },
  exerciseName: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  muted: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  videoLink: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 7 },
  textAction: { justifyContent: 'center', minHeight: 48 },
  skip: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', padding: 8 },
  setEditor: { borderTopColor: colors.border, borderTopWidth: 1, gap: 12, padding: 16 },
  setTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  setNumber: { color: colors.textSecondary, fontSize: 14, fontWeight: '800' },
  removeSet: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, minWidth: 108 },
  setLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  setInput: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.textPrimary, fontSize: 18, fontWeight: '700', minHeight: 56, paddingHorizontal: 12 },
  setNotes: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.textPrimary, fontSize: 16, minHeight: 56, paddingHorizontal: 12 },
  setActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveSet: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 52, minWidth: 100 },
  saveSetText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  check: { alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1.4, justifyContent: 'center', minHeight: 52, minWidth: 130 },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  checkedText: { color: colors.background },
  addSet: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, justifyContent: 'center', minHeight: 56 },
  addSetText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  finish: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 12, marginTop: 5, padding: 16 },
  input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.textPrimary, fontSize: 16, minHeight: 56, paddingHorizontal: 14 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 },
  secondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  abandon: { color: colors.danger, fontSize: 14, fontWeight: '700', minHeight: 48, padding: 12, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, paddingHorizontal: 2 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
  emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginBottom: 6 },
  videoBackdrop: { backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: 18 },
  videoSheet: { backgroundColor: colors.surface, borderRadius: 24, padding: 16 },
  videoTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  videoAttribution: { color: colors.gray500, fontSize: 12, lineHeight: 16, marginTop: 4 },
  videoClose: { color: colors.primary, fontSize: 12, fontWeight: '800', padding: 14, textAlign: 'center' },
})

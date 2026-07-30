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
import { triggerHaptic } from '../../../theme/haptics'

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
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
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
      if (preferences.hapticsEnabled) Vibration.vibrate([0, 180, 80, 180])
      onSkipRest()
    }
  }, [onSkipRest, preferences.hapticsEnabled, remaining, restTimer, timerKey])

  usePreventRemove(Boolean(session) && !canLeave, ({ data }) => {
    Alert.alert('Sair da sessão?', 'Escolha como deseja deixar o treino.', [
      { text: 'Continuar treinando', style: 'cancel' },
      {
        text: session?.status === 'PAUSED' ? 'Sair pausada' : 'Pausar e sair',
        onPress: () => {
          void (async () => {
            const success = session?.status === 'PAUSED' || await onPause()
            if (!success) return
            if (session?.status !== 'PAUSED') void triggerHaptic('SESSION_PAUSE', preferences.hapticsEnabled)
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
            void triggerHaptic('DESTRUCTIVE_CONFIRM', preferences.hapticsEnabled)
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
      void triggerHaptic('SESSION_COMPLETE', preferences.hapticsEnabled)
      setCanLeave(true)
      setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' }), 0)
    }
  }

  return (<>
    <ScreenScrollView
      contentContainerStyle={preferences.workoutHighContrast && { backgroundColor: colors.workout.background }}
      showsVerticalScrollIndicator={false}
    >
      <View
        accessibilityLabel={session.status === 'PAUSED' ? 'Sessão pausada' : 'Sessão em andamento'}
        style={[styles.sessionHeader, session.status === 'PAUSED' && styles.pausedHeader]}
      >
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
          onPress={() => void (async () => {
            const resuming = session.status === 'PAUSED'
            const success = await (resuming ? onResume() : onPause())
            if (success) {
              void triggerHaptic(resuming ? 'SESSION_RESUME' : 'SESSION_PAUSE', preferences.hapticsEnabled)
            }
          })()}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            {session.status === 'PAUSED' ? 'Continuar' : 'Pausar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <View
          accessible
          accessibilityLabel="Progresso da sessão"
          accessibilityValue={{
            min: 0,
            max: session.totalPlannedSets,
            now: session.completedSets,
            text: `${session.completedSets} de ${session.totalPlannedSets} séries`,
          }}
          style={styles.metric}
        >
          <Text style={styles.metricLabel}>PROGRESSO</Text>
          <Text style={styles.metricValue}>
            {session.totalPlannedSets
              ? Math.round(session.completedSets / session.totalPlannedSets * 100)
              : 0}%
          </Text>
        </View>
        <View accessible accessibilityLabel={`Volume registrado: ${session.totalVolume} quilogramas`} style={styles.metric}>
          <Text style={styles.metricLabel}>VOLUME</Text>
          <Text style={styles.metricValue}>{session.totalVolume}kg</Text>
        </View>
      </View>

      {remaining > 0 && (
        <View accessible accessibilityLabel={`Descanso: ${formatTime(remaining)} restantes`} accessibilityRole="timer" style={styles.timer}>
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

      {session.exercises.map((exercise, index) => {
        const statusLabel = exercise.status === 'SKIPPED'
          ? 'Pulado'
          : exercise.sets.length > 0 && exercise.sets.every((set) => set.completed)
            ? 'Concluído'
            : 'Pendente'
        return (
          <View
            key={exercise.id}
            accessibilityLabel={`${exercise.name}. Estado: ${statusLabel}.`}
            style={styles.card}
          >
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
              <Text style={styles.exerciseStatus}>Estado: {statusLabel}</Text>
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
              style={styles.textAction}
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
            <Text accessibilityLiveRegion="polite" style={styles.error}>{errors[`exercise:${exercise.id}`]}</Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: busyKeys.has(`exercise:${exercise.id}`) }}
            disabled={busyKeys.has(`exercise:${exercise.id}`)}
            style={styles.addSet}
            onPress={() => void onAddSet(exercise.id)}
          >
            <Text style={styles.addSetText}>＋ Adicionar série</Text>
          </TouchableOpacity>
          </View>
        )
      })}

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
        {!!errors.session && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.session}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busyKeys.has('session') }}
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
          style={styles.textAction}
          onPress={() => Alert.alert(
            'Abandonar sessão?',
            'Os registros feitos serão preservados.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Abandonar',
                style: 'destructive',
                onPress: () => void (async () => {
                  void triggerHaptic('DESTRUCTIVE_CONFIRM', preferences.hapticsEnabled)
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
        <View accessibilityViewIsModal style={styles.videoSheet}>
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
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
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
    if (await onSave(input(completing)) && completing) {
      void triggerHaptic('SET_COMPLETE', preferences.hapticsEnabled)
      onStartRest()
    }
  }

  return (
    <View accessibilityLabel={`Série ${set.setNumber}. ${set.completed ? 'Concluída' : 'Pendente'}.`} style={styles.setEditor}>
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
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
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
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
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
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.timerAction}>
      <Text style={[timerActionStyle, styles.timerActionText]}>{label}</Text>
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

const createStyles = (colors: ThemeColors, highContrast = false) => {
  const workout = highContrast ? colors.workout : null
  const background = workout?.background ?? colors.background
  const surface = workout?.surface ?? colors.surface
  const border = workout?.border ?? colors.border
  const text = workout?.text ?? colors.textPrimary
  const secondaryText = workout?.textSecondary ?? colors.textSecondary
  const completed = workout?.completed ?? colors.success
  const onCompleted = workout?.onCompleted ?? colors.background
  const danger = workout?.danger ?? colors.danger
  const borderWidth = highContrast ? 2 : 1
  return StyleSheet.create({
  sessionHeader: { alignItems: 'center', backgroundColor: highContrast ? surface : undefined, borderColor: highContrast ? border : undefined, borderRadius: 18, borderWidth: highContrast ? 2 : 0, flexDirection: 'row', gap: 12, marginBottom: 12, padding: 12 },
  pausedHeader: { backgroundColor: surface, borderColor: colors.warning, borderWidth: 2 },
  eyebrow: { color: secondaryText, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  title: { color: text, fontSize: 30, fontWeight: '700', letterSpacing: -1, lineHeight: 37, marginTop: 7 },
  metrics: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metric: { backgroundColor: surface, borderColor: border, borderRadius: 18, borderWidth, flex: 1, padding: 16 },
  metricLabel: { color: secondaryText, fontSize: 12 },
  metricValue: { color: text, fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 6 },
  timer: { alignItems: 'center', backgroundColor: workout?.timer ?? colors.textPrimary, borderColor: highContrast ? border : undefined, borderRadius: 22, borderWidth: highContrast ? 2 : 0, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 12, padding: 18 },
  timerLabel: { color: workout?.timerText ?? colors.background, fontSize: 14, fontWeight: '800' },
  timerValue: { color: workout?.timerText ?? colors.background, fontSize: 36, fontWeight: '700', lineHeight: 43, marginTop: 3 },
  timerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerAction: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  timerActionText: { color: workout?.timerText ?? colors.background },
  card: { backgroundColor: surface, borderColor: border, borderRadius: 21, borderWidth, marginBottom: 12, overflow: 'hidden' },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 16 },
  index: { backgroundColor: colors.primary, borderRadius: 13, color: colors.onPrimary, fontSize: 16, fontWeight: '800', minWidth: 48, overflow: 'hidden', padding: 14, textAlign: 'center' },
  exerciseName: { color: text, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  exerciseStatus: { color: text, fontSize: 13, fontWeight: '900', marginTop: 5 },
  muted: { color: secondaryText, fontSize: 14, lineHeight: 20, marginTop: 4 },
  videoLink: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 7 },
  textAction: { justifyContent: 'center', minHeight: 48 },
  skip: { color: secondaryText, fontSize: 14, fontWeight: '700', padding: 8 },
  setEditor: { backgroundColor: highContrast ? background : undefined, borderTopColor: border, borderTopWidth: borderWidth, gap: 12, padding: 16 },
  setTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  setNumber: { color: secondaryText, fontSize: 14, fontWeight: '800' },
  removeSet: { color: danger, fontSize: 14, fontWeight: '700' },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, minWidth: 108 },
  setLabel: { color: secondaryText, fontSize: 12, marginBottom: 4 },
  setInput: { backgroundColor: highContrast ? surface : colors.surfaceSecondary, borderColor: border, borderRadius: 11, borderWidth, color: text, fontSize: 18, fontWeight: '700', minHeight: 56, paddingHorizontal: 12 },
  setNotes: { backgroundColor: highContrast ? surface : colors.surfaceSecondary, borderColor: border, borderRadius: 11, borderWidth, color: text, fontSize: 16, minHeight: 56, paddingHorizontal: 12 },
  setActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveSet: { alignItems: 'center', borderColor: border, borderRadius: 12, borderWidth, flex: 1, justifyContent: 'center', minHeight: 52, minWidth: 100 },
  saveSetText: { color: text, fontSize: 14, fontWeight: '800' },
  check: { alignItems: 'center', backgroundColor: workout?.pending ?? colors.surfaceSecondary, borderColor: border, borderRadius: 12, borderWidth, flex: 1.4, justifyContent: 'center', minHeight: 52, minWidth: 130 },
  checked: { backgroundColor: completed, borderColor: highContrast ? border : completed },
  checkText: { color: text, fontSize: 14, fontWeight: '800' },
  checkedText: { color: onCompleted },
  addSet: { alignItems: 'center', borderTopColor: border, borderTopWidth: borderWidth, justifyContent: 'center', minHeight: 56 },
  addSetText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  finish: { backgroundColor: surface, borderColor: border, borderRadius: 22, borderWidth, gap: 12, marginTop: 5, padding: 16 },
  input: { backgroundColor: highContrast ? background : colors.surfaceSecondary, borderColor: border, borderRadius: 14, borderWidth, color: text, fontSize: 16, minHeight: 56, paddingHorizontal: 14 },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', backgroundColor: highContrast ? background : undefined, borderColor: border, borderRadius: 14, borderWidth, justifyContent: 'center', minHeight: 56, paddingHorizontal: 14 },
  secondaryText: { color: text, fontSize: 14, fontWeight: '800' },
  abandon: { color: danger, fontSize: 14, fontWeight: '800', minHeight: 56, padding: 12, textAlign: 'center' },
  error: { color: danger, fontSize: 14, lineHeight: 20, paddingHorizontal: 2 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
  emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginBottom: 6 },
  videoBackdrop: { backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: 18 },
  videoSheet: { backgroundColor: colors.surface, borderRadius: 24, padding: 16 },
  videoTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  videoAttribution: { color: colors.gray500, fontSize: 12, lineHeight: 16, marginTop: 4 },
  videoClose: { color: colors.primary, fontSize: 12, fontWeight: '800', padding: 14, textAlign: 'center' },
  })
}

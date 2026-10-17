import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { ArrowLeft, Circle, CircleCheck, Minus, Pause, Play, Plus } from 'lucide-react-native'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../navigation/types'
import type {
  ExerciseDefinition,
  LocalProgressionSuggestion,
  SessionExercise,
  SessionExerciseStatus,
  SetLog,
  SetLogInput,
  WorkoutSession,
} from '@training/training-domain'
import {
  rankExerciseSubstitutions,
  selectPreviousPerformance,
  suggestProgression,
  effectiveExerciseDefinitionId,
} from '@training/training-domain'
import type { RestTimerState } from '../model/restTimer'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { type ThemeColors, useTheme } from '../../../theme'
import { ExerciseVideo } from '../../exercise-library/ExerciseVideo'
import { attributionLabel, resolveMediaAttribution } from '../../exercise-library/libraryState'
import { ThemedTextInput } from '../../../components/ThemedTextInput'
import { BottomActionBar } from '../../../components/ui/BottomActionBar'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { triggerHaptic } from '../../../theme/haptics'
import { fontFamilies, typography } from '../../../theme/typography'

interface Props {
  session: WorkoutSession | null
  history: WorkoutSession[]
  library: ExerciseDefinition[]
  restTimer: RestTimerState | null
  errors: Record<string, string>
  busyKeys: Set<string>
  onUpdateSet: (exerciseId: number, setId: number, input: SetLogInput) => Promise<boolean>
  onAddSet: (exerciseId: number) => Promise<boolean>
  onRemoveSet: (exerciseId: number, setId: number) => Promise<boolean>
  onSetExerciseStatus: (exerciseId: number, status: SessionExerciseStatus) => Promise<boolean>
  onUpdateExerciseNotes: (exerciseId: number, notes: string) => Promise<boolean>
  onUpdateSessionNotes: (notes: string) => Promise<boolean>
  onApplySuggestion: (exerciseId: number, suggestion: LocalProgressionSuggestion) => Promise<boolean>
  onSubstituteExercise: (exerciseId: number, replacementId: number, reason: string) => Promise<boolean>
  onUndoSubstitution: (exerciseId: number) => Promise<boolean>
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
    history,
    library,
    restTimer,
    errors,
    busyKeys,
    onUpdateSet,
    onAddSet,
    onRemoveSet,
    onSetExerciseStatus,
    onUpdateExerciseNotes,
    onUpdateSessionNotes,
    onApplySuggestion,
    onSubstituteExercise,
    onUndoSubstitution,
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
  const text = preferences.workoutHighContrast ? colors.workout.text : colors.tx
  const secondaryText = preferences.workoutHighContrast ? colors.workout.textSecondary : colors.t2
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [now, setNow] = useState(Date.now())
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [canLeave, setCanLeave] = useState(false)
  const [videoExercise, setVideoExercise] = useState<SessionExercise | null>(null)
  const [videoRetryKey, setVideoRetryKey] = useState(0)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set())
  const [substitutionFor, setSubstitutionFor] = useState<number | null>(null)
  const [expandedExerciseDetails, setExpandedExerciseDetails] = useState<number | null>(null)
  const [sessionNoteSaved, setSessionNoteSaved] = useState(false)
  const [focusedSetId, setFocusedSetId] = useState<number | null>(null)
  const [restFinished, setRestFinished] = useState(false)
  const notifiedTimer = useRef('')
  const finishedTimerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusedSetAction = useRef<{ id: number; run: () => Promise<boolean> } | null>(null)
  const noteSession = useRef(session?.id)
  const definitions = useMemo(
    () => new Map(library.map((exercise) => [exercise.id, exercise])),
    [library],
  )
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

  useEffect(() => {
    if (session && noteSession.current !== session.id) {
      noteSession.current = session.id
      setNotes(session.notes)
      setSessionNoteSaved(false)
      setFocusedSetId(null)
      focusedSetAction.current = null
    }
  }, [session])

  const remaining = restTimer
    ? Math.max(0, Math.ceil((
      restTimer.endsAt - (restTimer.paused ? restTimer.pausedAt ?? now : now)
    ) / 1000))
    : 0
  const timerKey = restTimer ? `${restTimer.sessionId}:${restTimer.setId}:${restTimer.endsAt}` : ''
  const firstPendingSet = session?.exercises
    .filter((exercise) => exercise.status !== 'SKIPPED')
    .flatMap((exercise) => exercise.sets)
    .find((set) => !set.completed) ?? null
  const selectedSet = session?.exercises.flatMap((exercise) => exercise.sets)
    .find((set) => set.id === focusedSetId) ?? null
  const activeSet = selectedSet ?? firstPendingSet
  const activeExercise = activeSet
    ? session?.exercises.find((exercise) => exercise.sets.some((set) => set.id === activeSet.id)) ?? null
    : null
  useEffect(() => {
    if (restTimer && !restTimer.paused && remaining === 0 && notifiedTimer.current !== timerKey) {
      notifiedTimer.current = timerKey
      setRestFinished(true)
      void triggerHaptic('REST_TIMER_COMPLETE', preferences.hapticsEnabled)
      onSkipRest()
      if (finishedTimerTimeout.current) clearTimeout(finishedTimerTimeout.current)
      finishedTimerTimeout.current = setTimeout(() => {
        setRestFinished(false)
        finishedTimerTimeout.current = null
      }, 1_800)
    }
  }, [onSkipRest, preferences.hapticsEnabled, remaining, restTimer, timerKey])

  useEffect(() => () => {
    if (finishedTimerTimeout.current) clearTimeout(finishedTimerTimeout.current)
  }, [])

  useEffect(() => {
    if (restTimer && remaining > 0) setRestFinished(false)
  }, [remaining, restTimer])

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

  async function completeFocusedSet() {
    if (!activeSet) return
    const action = focusedSetAction.current
    if (!action || action.id !== activeSet.id) return
    if (await action.run()) setFocusedSetId(null)
  }

  function confirmCompleteSession() {
    Alert.alert(
      'Concluir sessão?',
      'A sessão será encerrada e salva no histórico.',
      [
        { text: 'Continuar treinando', style: 'cancel' },
        { text: 'Concluir e salvar', onPress: () => void completeSession() },
      ],
    )
  }

  function confirmAbandonSession() {
    Alert.alert(
      'Abandonar sessão?',
      'Os registros feitos serão preservados.',
      [
        { text: 'Continuar treinando', style: 'cancel' },
        {
          text: 'Abandonar sessão',
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
    )
  }

  return (<>
    <ScreenScrollView
      contentContainerStyle={{
        backgroundColor: preferences.workoutHighContrast ? colors.workout.background : colors.bg,
        paddingBottom: 176,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityLabel="Voltar" accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={text} size={20} strokeWidth={1.8} />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text style={styles.topBarName} numberOfLines={1}>{session.workoutName}</Text>
          <View style={styles.sessionState}>
            {session.status === 'PAUSED'
              ? <Pause color={secondaryText} size={12} strokeWidth={2} />
              : <View style={styles.stateDot} />}
            <Text style={styles.sessionStateText}>
              {session.status === 'PAUSED' ? 'Pausada' : 'Em andamento'}
            </Text>
          </View>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busyKeys.has('session') }} disabled={busyKeys.has('session')} onPress={confirmAbandonSession} style={styles.abandonTop}>
          <Text style={styles.abandonTopText}>Abandonar</Text>
        </TouchableOpacity>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Progresso da sessão"
        accessibilityValue={{
          min: 0,
          max: session.totalPlannedSets,
          now: session.completedSets,
          text: `${session.completedSets} de ${session.totalPlannedSets} séries concluídas`,
        }}
        style={styles.progressBlock}
      >
        <View style={styles.progressInfo}>
          <Text style={styles.progressValue}>
            {session.completedSets} / {session.totalPlannedSets} séries
          </Text>
          <Text style={styles.volumeValue}>{session.totalVolume} kg</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${session.totalPlannedSets
              ? Math.min(100, session.completedSets / session.totalPlannedSets * 100)
              : 0}%`,
          }]} />
        </View>
      </View>

      {remaining > 0 && (
        <View accessible accessibilityLabel={formatTimerAnnouncement(Math.ceil(remaining / 15) * 15)} accessibilityLiveRegion="polite" accessibilityRole="timer" style={styles.timer}>
          <View>
            <Text style={styles.timerLabel}>Descanso</Text>
            <Text style={styles.timerValue}>{formatTime(remaining)}</Text>
          </View>
          <View style={styles.timerActions}>
            <TimerAction label="−15 s" onPress={() => onAdjustRest(-15)} kind="secondary" />
            <TimerAction label="+15 s" onPress={() => onAdjustRest(15)} kind="secondary" />
            <TimerAction label="Pular descanso" onPress={onSkipRest} kind="tonal" />
          </View>
        </View>
      )}
      {restFinished && <Text accessibilityLiveRegion="polite" style={styles.restComplete}>Descanso concluído</Text>}

      {session.exercises.map((exercise, index) => {
        const effectiveId = effectiveExerciseDefinitionId(exercise)
        const definition = definitions.get(effectiveId)
        const previous = selectPreviousPerformance(
          history,
          effectiveId,
          session.trainingPlanId,
        )
        const suggestion = suggestProgression(
          exercise,
          previous,
          definition?.equipment.toLocaleLowerCase('pt-BR').includes('peso corporal') ?? false,
        )
        const substitutions = definition
          ? rankExerciseSubstitutions(definition, library)
              .filter((candidate) => !session.exercises.some((item) =>
                item.id !== exercise.id
                && effectiveExerciseDefinitionId(item) === candidate.exercise.id))
              .slice(0, 4)
          : []
        const statusLabel = exercise.status === 'SKIPPED'
          ? 'Pulado'
          : exercise.sets.length > 0 && exercise.sets.every((set) => set.completed)
            ? 'Concluído'
            : 'Pendente'
        const isActiveExercise = activeExercise?.id === exercise.id
        const detailsExpanded = expandedExerciseDetails === exercise.id
        return (
          <View
            key={exercise.id}
            accessibilityLabel={`${exercise.name}. Estado: ${statusLabel}.`}
            style={[styles.exerciseBlock, isActiveExercise && styles.activeExerciseBlock]}
          >
            {isActiveExercise && (
              <Text style={styles.exerciseEyebrow}>
                Exercício {index + 1} de {session.exercises.length} · {activeSet?.completed ? 'em revisão' : 'em andamento'}
              </Text>
            )}
            <View style={styles.exerciseHeader}>
              <View style={[styles.index, isActiveExercise && styles.indexActive]}>
                <Text style={[styles.indexText, isActiveExercise && styles.indexActiveText]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>
                  {exercise.substituteName ?? exercise.name}
                </Text>
                {!!exercise.substituteName && (
                  <Text style={styles.substitution}>
                    Planejado: {exercise.name} · Realizado: {exercise.substituteName}
                  </Text>
                )}
                <Text style={styles.muted}>
                  {exercise.category === 'CARDIO' || exercise.timed
                    ? 'Duração'
                    : `${exercise.plannedMinReps}–${exercise.plannedMaxReps} reps`}
                  {' · '}{exercise.restSeconds}s descanso
                </Text>
                {!isActiveExercise && <Text style={styles.exerciseStatus}>{statusLabel}</Text>}
                {isActiveExercise && previous && (
                  <Text style={styles.referenceSummary}>
                    Referência · {new Date(previous.completedAt).toLocaleDateString('pt-BR')} · {previous.load == null ? 'carga não registrada' : `${previous.load} kg`}
                  </Text>
                )}
                {!!exercise.primaryVideoUrl && (
                  <TouchableOpacity accessibilityLabel={`Ver execução de ${exercise.name}`} accessibilityRole="button" onPress={() => openVideo(exercise)} style={styles.textAction}>
                    <Text style={styles.videoLink}>Ver execução</Text>
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

            {previous && detailsExpanded && (
              <View style={styles.reference}>
              <Text style={styles.referenceTitle}>Último desempenho</Text>
              <Text style={styles.referenceText}>
                {new Date(previous.completedAt).toLocaleDateString('pt-BR')} · {previous.completedSetCount} série(s)
              </Text>
              <Text style={styles.referenceText}>
                Carga anterior: {previous.load == null ? 'não registrada' : `${previous.load} kg`}
              </Text>
              <Text style={styles.referenceText}>
                Repetições anteriores: {previous.reps.length ? previous.reps.join(' · ') : 'não registradas'}
              </Text>
              <Text style={styles.referenceText}>
                RPE anterior: {previous.lastRpe ?? 'não registrado'}
              </Text>
              <Text style={styles.referenceText}>
                Anotação anterior: {previous.annotation ?? 'nenhuma'}
              </Text>
              </View>
            )}

            {detailsExpanded && suggestion.type !== 'NO_HISTORY' && !dismissedSuggestions.has(exercise.id) && (
              <View accessibilityLabel="Sugestão local disponível" style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>Sugestão local</Text>
              <Text style={styles.referenceText}>{suggestion.reason}</Text>
              <Text style={styles.referenceText}>
                {suggestion.proposedLoad != null
                  ? `Carga proposta: ${suggestion.proposedLoad} kg`
                  : suggestion.proposedDurationSeconds != null
                    ? `Duração proposta: ${suggestion.proposedDurationSeconds} s`
                    : suggestion.proposedReps != null
                      ? `Repetições propostas: ${suggestion.proposedReps}`
                      : 'Manter o alvo atual.'}
              </Text>
              <View style={styles.inlineActions}>
                <SmallAction
                  label="Aplicar nesta sessão"
                  disabled={busyKeys.has(`suggestion:${exercise.id}`)}
                  onPress={() => void (async () => {
                    if (await onApplySuggestion(exercise.id, suggestion)) {
                      setDismissedSuggestions((current) => new Set(current).add(exercise.id))
                    }
                  })()}
                />
                <SmallAction
                  label="Dispensar"
                  onPress={() => setDismissedSuggestions((current) => new Set(current).add(exercise.id))}
                />
              </View>
              </View>
            )}

            {detailsExpanded && <View style={styles.substitutionPanel}>
            {exercise.substituteExerciseDefinitionId ? (
              <SmallAction
                label="Desfazer substituição"
                disabled={busyKeys.has(`substitution:${exercise.id}`)}
                onPress={() => void onUndoSubstitution(exercise.id)}
              />
            ) : (
              <SmallAction
                label="Ver substituições"
                disabled={!substitutions.length}
                onPress={() => setSubstitutionFor(
                  substitutionFor === exercise.id ? null : exercise.id)}
              />
            )}
            {substitutionFor === exercise.id && substitutions.map((candidate) => (
              <TouchableOpacity
                key={candidate.exercise.id}
                accessibilityRole="button"
                disabled={busyKeys.has(`substitution:${exercise.id}`)}
                onPress={() => void (async () => {
                  if (await onSubstituteExercise(
                    exercise.id,
                    candidate.exercise.id,
                    candidate.reason,
                  )) setSubstitutionFor(null)
                })()}
                style={styles.substitutionOption}
              >
                <Text style={styles.substitutionName}>{candidate.exercise.name}</Text>
                <Text style={styles.referenceText}>{candidate.reason}</Text>
              </TouchableOpacity>
            ))}
            </View>}

          {exercise.sets.map((set) => (
            <SetEditor
              key={set.id}
              exercise={exercise}
              set={set}
              busy={busyKeys.has(`set:${set.id}`)}
              error={errors[`set:${set.id}`]}
              active={activeSet?.id === set.id}
              highContrast={preferences.workoutHighContrast}
              onActivate={() => setFocusedSetId(set.id)}
              onRegisterComplete={(run) => {
                if (run) focusedSetAction.current = { id: set.id, run }
                else if (focusedSetAction.current?.id === set.id) focusedSetAction.current = null
              }}
              onSave={(input) => onUpdateSet(exercise.id, set.id, input)}
              onRemove={() => onRemoveSet(exercise.id, set.id)}
              onStartRest={() => onStartRest(exercise.id, set.id, exercise.restSeconds)}
            />
          ))}

            {detailsExpanded && <ExerciseNotesEditor
              exercise={exercise}
              busy={busyKeys.has(`exercise-note:${exercise.id}`)}
              onSave={(value) => onUpdateExerciseNotes(exercise.id, value)}
            />}

          {!!errors[`exercise:${exercise.id}`] && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{errors[`exercise:${exercise.id}`]}</Text>
          )}
            <View style={styles.exerciseActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsExpanded }}
                style={styles.detailAction}
                onPress={() => setExpandedExerciseDetails(detailsExpanded ? null : exercise.id)}
              >
                <Text style={styles.addSetText}>{detailsExpanded ? 'Ocultar detalhes' : 'Histórico e opções'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: busyKeys.has(`exercise:${exercise.id}`) }}
                disabled={busyKeys.has(`exercise:${exercise.id}`)}
                style={styles.detailAction}
                onPress={() => void onAddSet(exercise.id)}
              >
                <Plus color={preferences.workoutHighContrast ? colors.workout.text : colors.tx} size={15} strokeWidth={1.8} />
                <Text style={styles.addSetText}>Série</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}

      <View style={styles.finish}>
        <Text style={styles.finishTitle}>Resumo da sessão</Text>
        <ThemedTextInput
          highContrast={preferences.workoutHighContrast}
          accessibilityLabel="RPE geral"
          value={rpe}
          onChangeText={setRpe}
          keyboardType="decimal-pad"
          placeholder="RPE geral (1–10)"
          style={styles.input}
        />
        <ThemedTextInput
          highContrast={preferences.workoutHighContrast}
          accessibilityLabel="Anotações da sessão"
          value={notes}
          onChangeText={(value) => {
            setNotes(value.slice(0, 2_000))
            setSessionNoteSaved(false)
          }}
          placeholder="Anotações da sessão"
          multiline
          maxLength={2_000}
          style={styles.input}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busyKeys.has('session-note') }}
          disabled={busyKeys.has('session-note')}
          style={styles.saveSet}
          onPress={() => void (async () => {
            setSessionNoteSaved(await onUpdateSessionNotes(notes))
          })()}
        >
          <Text style={styles.saveSetText}>Salvar anotação</Text>
        </TouchableOpacity>
        {sessionNoteSaved && (
          <Text accessibilityLiveRegion="polite" style={styles.saved}>Anotação salva.</Text>
        )}
        {!!errors.session && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.session}</Text>}
      </View>
    </ScreenScrollView>
    <BottomActionBar highContrast={preferences.workoutHighContrast}>
      {activeSet && (
        <PrimaryButton
          label={activeSet.completed ? `Salvar série ${activeSet.setNumber}` : `Concluir série ${activeSet.setNumber}`}
          onPress={() => void completeFocusedSet()}
          disabled={session.status === 'PAUSED' || busyKeys.has(`set:${activeSet.id}`)}
          highContrast={preferences.workoutHighContrast}
        />
      )}
      <View style={styles.footerActions}>
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
          style={styles.footerSecondary}
        >
          {session.status === 'PAUSED'
            ? <Play color={text} size={16} strokeWidth={1.8} />
            : <Pause color={text} size={16} strokeWidth={1.8} />}
          <Text style={styles.footerSecondaryText}>{session.status === 'PAUSED' ? 'Retomar' : 'Pausar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: busyKeys.has('session') }}
          disabled={busyKeys.has('session')}
          onPress={confirmCompleteSession}
          style={styles.footerSecondary}
        >
          <Text style={styles.footerSecondaryText}>Concluir e salvar</Text>
        </TouchableOpacity>
      </View>
    </BottomActionBar>
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

function ExerciseNotesEditor({
  exercise,
  busy,
  onSave,
}: {
  exercise: SessionExercise
  busy: boolean
  onSave: (notes: string) => Promise<boolean>
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  const [notes, setNotes] = useState(exercise.userNotes)
  const [saved, setSaved] = useState(false)
  useEffect(() => setNotes(exercise.userNotes), [exercise.userNotes])
  return (
    <View style={styles.exerciseNotes}>
      <Text style={styles.referenceTitle}>Anotações do exercício</Text>
      <ThemedTextInput
        highContrast={preferences.workoutHighContrast}
        accessibilityLabel={`Anotações do exercício ${exercise.name}`}
        value={notes}
        onChangeText={(value) => {
          setNotes(value.slice(0, 1_000))
          setSaved(false)
        }}
        multiline
        maxLength={1_000}
        placeholder="Anotação desta sessão"
        style={styles.setNotes}
      />
      <SmallAction
        label={busy ? 'Salvando…' : 'Salvar anotação'}
        disabled={busy}
        onPress={() => void (async () => setSaved(await onSave(notes)))()}
      />
      {saved && <Text accessibilityLiveRegion="polite" style={styles.saved}>Anotação salva.</Text>}
    </View>
  )
}

function SmallAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.smallAction}
    >
      <Text style={styles.smallActionText}>{label}</Text>
    </TouchableOpacity>
  )
}

function SetEditor({
  exercise,
  set,
  busy,
  error,
  active,
  highContrast,
  onActivate,
  onRegisterComplete,
  onSave,
  onRemove,
  onStartRest,
}: {
  exercise: SessionExercise
  set: SetLog
  busy: boolean
  error?: string
  active: boolean
  highContrast: boolean
  onActivate: () => void
  onRegisterComplete: (run: (() => Promise<boolean>) | null) => void
  onSave: (input: SetLogInput) => Promise<boolean>
  onRemove: () => Promise<boolean>
  onStartRest: () => void
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, highContrast)
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

  async function saveActiveSet() {
    const success = await onSave(input(true))
    if (success && !set.completed) {
      void triggerHaptic('SET_COMPLETE', preferences.hapticsEnabled)
      onStartRest()
    }
    return success
  }

  useEffect(() => {
    if (!active) {
      onRegisterComplete(null)
      return
    }
    onRegisterComplete(saveActiveSet)
    return () => onRegisterComplete(null)
  }, [active, duration, distance, load, notes, onRegisterComplete, reps, rpe, set.completed])

  if (!active) {
    const summary = set.completed ? completedSetSummary(set, timed, cardio) : 'Pendente'
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={set.completed
          ? `Série ${set.setNumber}, ${summary}, concluída. Toque para editar.`
          : `Série ${set.setNumber}, pendente. Toque para iniciar.`}
        onPress={onActivate}
        style={styles.compactSetRow}
      >
        {set.completed
          ? <CircleCheck color={highContrast ? colors.workout.text : colors.tx} size={20} strokeWidth={1.8} />
          : <Circle color={highContrast ? colors.workout.textSecondary : colors.t2} size={20} strokeWidth={1.5} />}
        <Text style={styles.compactSetText}>Série {set.setNumber}</Text>
        <Text style={styles.compactSetSummary}>{summary}</Text>
        <Text style={styles.compactSetStatus}>{set.completed ? 'Concluída' : 'Pendente'}</Text>
      </Pressable>
    )
  }

  return (
    <View accessibilityLabel={`Série ${set.setNumber}. ${set.completed ? 'Concluída' : 'Em andamento'}.`} style={styles.activeSetEditor}>
      <View style={styles.setTitle}>
        <View style={styles.activeSetHeading}>
          <Circle color={highContrast ? colors.workout.text : colors.ac} size={18} strokeWidth={2} />
          <Text style={styles.setNumber}>Série {set.setNumber} · {set.completed ? 'edição' : 'em andamento'}</Text>
        </View>
        {set.manuallyAdded && (
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void onRemove()} style={styles.textAction}>
            <Text style={styles.removeSet}>Remover</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fields}>
        {!timed && (
          <>
            <StepperField label="Repetições" value={reps} onChange={setReps} step={1} />
            <StepperField label="Carga · kg" value={load} onChange={setLoad} step={1} />
          </>
        )}
        {timed && <SetField label="Duração · s" value={duration} onChange={setDuration} />}
        {cardio && <SetField label="Distância · km" value={distance} onChange={setDistance} decimal />}
        <SetField label="RPE" value={rpe} onChange={setRpe} decimal />
      </View>
      <ThemedTextInput
        highContrast={highContrast}
        accessibilityLabel="Observação da série"
        value={notes}
        onChangeText={setNotes}
        placeholder="Observação opcional"
        maxLength={500}
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
          <Text style={styles.saveSetText}>{busy ? 'Salvando…' : 'Salvar rascunho'}</Text>
        </TouchableOpacity>
        <Text style={styles.completionHint}>
          {set.completed ? 'Use “Salvar série” para guardar as alterações.' : 'Concluir esta série inicia o descanso.'}
        </Text>
      </View>
    </View>
  )
}

function completedSetSummary(set: SetLog, timed: boolean, cardio: boolean) {
  if (cardio) {
    const pieces = [set.distance == null ? null : `${set.distance} km`, set.durationSeconds == null ? null : `${set.durationSeconds} s`].filter(Boolean)
    return pieces.join(' · ') || 'Registrada'
  }
  if (timed) return set.durationSeconds == null ? 'Registrada' : `${set.durationSeconds} s`
  const pieces = [set.load == null ? null : `${set.load} kg`, set.reps == null ? null : `${set.reps} reps`].filter(Boolean)
  return pieces.join(' × ') || 'Registrada'
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
        highContrast={preferences.workoutHighContrast}
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

function StepperField({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  step: number
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holding = useRef(false)

  useEffect(() => () => {
    if (interval.current) clearInterval(interval.current)
    if (resetTimeout.current) clearTimeout(resetTimeout.current)
  }, [])

  function adjust(direction: number) {
    const next = Math.max(0, toNumber(value) + direction * step)
    onChange(String(Number(next.toFixed(2))))
  }

  function startRepeat(direction: number) {
    holding.current = true
    adjust(direction)
    interval.current = setInterval(() => adjust(direction), 120)
  }

  function stopRepeat() {
    if (interval.current) clearInterval(interval.current)
    interval.current = null
    resetTimeout.current = setTimeout(() => { holding.current = false }, 250)
  }

  return (
    <View style={styles.field}>
      <Text style={styles.setLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel={`Diminuir ${label}`}
          accessibilityRole="button"
          onPress={() => { if (!holding.current) adjust(-1) }}
          onLongPress={() => startRepeat(-1)}
          onPressOut={stopRepeat}
          delayLongPress={350}
          style={styles.stepperButton}
        >
          <Minus color={preferences.workoutHighContrast ? colors.workout.text : colors.tx} size={17} strokeWidth={1.8} />
        </Pressable>
        <ThemedTextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
          highContrast={preferences.workoutHighContrast}
          style={styles.stepperInput}
        />
        <Pressable
          accessibilityLabel={`Aumentar ${label}`}
          accessibilityRole="button"
          onPress={() => { if (!holding.current) adjust(1) }}
          onLongPress={() => startRepeat(1)}
          onPressOut={stopRepeat}
          delayLongPress={350}
          style={styles.stepperButton}
        >
          <Plus color={preferences.workoutHighContrast ? colors.workout.text : colors.tx} size={17} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  )
}

function TimerAction({
  label,
  onPress,
  kind,
}: {
  label: string
  onPress: () => void
  kind: 'secondary' | 'tonal'
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.timerAction, kind === 'tonal' && styles.timerActionTonal]}
    >
      <Text style={styles.timerActionText}>{label}</Text>
    </Pressable>
  )
}

function toNumber(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function formatTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function formatTimerAnnouncement(seconds: number) {
  if (seconds <= 0) return 'Descanso concluído'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  const time = [
    minutes ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : '',
    remainder ? `${remainder} ${remainder === 1 ? 'segundo' : 'segundos'}` : '',
  ].filter(Boolean).join(' e ')
  return `Descanso, ${time} restantes`
}

const createStyles = (colors: ThemeColors, highContrast = false) => {
  const workout = highContrast ? colors.workout : null
  const background = workout?.background ?? colors.bg
  const surface = workout?.surface ?? colors.s1
  const secondarySurface = workout?.pending ?? colors.s2
  const border = workout?.border ?? colors.bd
  const muted = workout?.textSecondary ?? colors.t2
  const text = workout?.text ?? colors.tx
  const accent = workout?.completed ?? colors.ac
  const onAccent = workout?.onCompleted ?? colors.on
  const danger = workout?.danger ?? colors.dg
  const borderWidth = highContrast ? 2 : 1
  return StyleSheet.create({
    topBar: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 24, minHeight: 48 },
    backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 40 },
    topBarTitle: { flex: 1, minWidth: 0 },
    topBarName: { color: text, fontFamily: fontFamilies.text, fontSize: 14, fontWeight: '500' },
    sessionState: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 3 },
    stateDot: { backgroundColor: accent, borderRadius: 4, height: 7, width: 7 },
    sessionStateText: { ...typography.captionSmall, color: muted },
    abandonTop: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 },
    abandonTopText: { ...typography.bodySmall, color: danger, textDecorationLine: 'underline', textDecorationStyle: 'solid', textUnderlineOffset: 3 },
    progressBlock: { marginBottom: 28 },
    progressInfo: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressValue: { ...typography.numberMedium, color: text },
    volumeValue: { ...typography.numberSmall, color: muted },
    progressTrack: { backgroundColor: secondarySurface, borderRadius: 2, height: 3, overflow: 'hidden' },
    progressFill: { backgroundColor: accent, height: 3 },
    timer: { backgroundColor: highContrast ? background : 'transparent', borderColor: highContrast ? border : 'transparent', borderWidth: highContrast ? borderWidth : 0, gap: 12, marginBottom: 24, padding: highContrast ? 16 : 0 },
    timerLabel: { ...typography.caption, color: muted },
    timerValue: { ...typography.numberXL, color: highContrast ? text : accent, fontWeight: highContrast ? '400' : '300', marginTop: 3 },
    timerActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timerAction: { alignItems: 'center', borderColor: highContrast ? border : colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 },
    timerActionTonal: { backgroundColor: secondarySurface, borderColor: 'transparent' },
    timerActionText: { ...typography.bodySmall, color: text, fontWeight: '500' },
    restComplete: { ...typography.bodySmall, color: accent, marginBottom: 20 },
    exerciseBlock: { backgroundColor: 'transparent', borderColor: 'transparent', borderRadius: 12, borderWidth: 0, marginBottom: 20, overflow: 'hidden' },
    activeExerciseBlock: { backgroundColor: surface, borderColor: accent, borderWidth: highContrast ? 2 : 1, paddingHorizontal: 12, paddingTop: 12 },
    exerciseEyebrow: { ...typography.captionSmall, color: muted, marginHorizontal: 4, marginBottom: 4 },
    exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 },
    index: { alignItems: 'center', borderColor: border, borderRadius: 16, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 },
    indexActive: { backgroundColor: accent, borderColor: accent },
    indexText: { ...typography.numberSmall, color: muted },
    indexActiveText: { color: onAccent },
    exerciseName: { ...typography.titleSmall, color: text },
    exerciseStatus: { ...typography.captionSmall, color: muted, marginTop: 4 },
    muted: { ...typography.caption, color: muted, marginTop: 3 },
    referenceSummary: { ...typography.captionSmall, color: muted, marginTop: 6 },
    videoLink: { ...typography.bodySmall, color: text, marginTop: 2, textDecorationLine: 'underline', textUnderlineOffset: 3 },
    textAction: { justifyContent: 'center', minHeight: 48 },
    skip: { ...typography.caption, color: muted, paddingHorizontal: 4, textDecorationLine: 'underline', textUnderlineOffset: 3 },
    compactSetRow: { alignItems: 'center', borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 52, paddingHorizontal: 4 },
    compactSetText: { ...typography.bodySmall, color: text },
    compactSetSummary: { ...typography.numberSmall, color: muted, flex: 1, textAlign: 'right' },
    compactSetStatus: { ...typography.captionSmall, color: muted, minWidth: 64, textAlign: 'right' },
    activeSetEditor: { backgroundColor: highContrast ? surface : secondarySurface, borderColor: accent, borderRadius: 12, borderWidth: highContrast ? 2 : 1, gap: 12, marginTop: 8, padding: 12 },
    setTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    activeSetHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    setNumber: { ...typography.caption, color: text },
    removeSet: { ...typography.captionSmall, color: danger, textDecorationLine: 'underline', textUnderlineOffset: 3 },
    fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    field: { flexGrow: 1, minWidth: 120 },
    setLabel: { ...typography.captionSmall, color: muted, marginBottom: 4 },
    stepper: { alignItems: 'center', backgroundColor: highContrast ? background : secondarySurface, borderColor: highContrast ? border : 'transparent', borderRadius: 10, borderWidth: highContrast ? 1 : 0, flexDirection: 'row', height: 48, overflow: 'hidden' },
    stepperButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
    stepperInput: { ...typography.numberMedium, backgroundColor: 'transparent', borderWidth: 0, color: text, flex: 1, minHeight: 48, minWidth: 30, paddingHorizontal: 2, paddingVertical: 0, textAlign: 'center' },
    setInput: { backgroundColor: highContrast ? background : secondarySurface, borderColor: highContrast ? border : 'transparent', borderRadius: 10, borderWidth: highContrast ? 1 : 0, color: text, fontFamily: fontFamilies.data, fontSize: 18, minHeight: 48, paddingHorizontal: 12 },
    setNotes: { backgroundColor: highContrast ? background : secondarySurface, borderColor: highContrast ? border : 'transparent', borderRadius: 10, borderWidth: highContrast ? 1 : 0, color: text, fontFamily: fontFamilies.text, fontSize: 15, minHeight: 48, paddingHorizontal: 12 },
    setActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    saveSet: { alignItems: 'center', borderColor: highContrast ? border : colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, minWidth: 120, paddingHorizontal: 12 },
    saveSetText: { ...typography.bodySmall, color: text, fontWeight: '500' },
    completionHint: { ...typography.captionSmall, color: muted, flex: 1, minWidth: 145 },
    addSetText: { ...typography.bodySmall, color: text, textDecorationLine: 'underline', textUnderlineOffset: 3 },
    exerciseActions: { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 20, marginTop: 8 },
    detailAction: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 48 },
    reference: { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth, gap: 4, paddingVertical: 12 },
    referenceTitle: { ...typography.bodySmall, color: text, marginBottom: 4 },
    referenceText: { ...typography.caption, color: muted },
    suggestion: { backgroundColor: secondarySurface, gap: 6, marginTop: 8, padding: 12 },
    suggestionTitle: { ...typography.bodySmall, color: text },
    inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    smallAction: { alignItems: 'center', borderColor: highContrast ? border : colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
    smallActionText: { ...typography.caption, color: text },
    substitution: { ...typography.captionSmall, color: text, marginTop: 4 },
    substitutionPanel: { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth, gap: 8, paddingVertical: 12 },
    substitutionOption: { borderColor: highContrast ? border : colors.mu, borderRadius: 12, borderWidth: 1, minHeight: 48, padding: 12 },
    substitutionName: { ...typography.bodySmall, color: text },
    exerciseNotes: { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth, gap: 8, paddingVertical: 12 },
    saved: { ...typography.caption, color: text },
    finish: { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth, gap: 12, marginTop: 12, paddingTop: 20 },
    finishTitle: { ...typography.titleSmall, color: text },
    input: { backgroundColor: highContrast ? surface : secondarySurface, borderColor: highContrast ? border : 'transparent', borderRadius: 12, borderWidth: highContrast ? 1 : 0, color: text, fontFamily: fontFamilies.text, fontSize: 15, minHeight: 48, paddingHorizontal: 12 },
    error: { ...typography.caption, color: danger, paddingHorizontal: 2 },
    footerActions: { flexDirection: 'row', gap: 8 },
    footerSecondary: { alignItems: 'center', borderColor: highContrast ? border : colors.mu, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 10 },
    footerSecondaryText: { ...typography.bodySmall, color: text, fontWeight: '500' },
    primary: { alignItems: 'center', backgroundColor: accent, borderRadius: 12, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 },
    primaryText: { color: onAccent, ...typography.titleSmall },
    empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
    emptyTitle: { ...typography.titleSmall, color: text, marginBottom: 6 },
    videoBackdrop: { backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: 18 },
    videoSheet: { backgroundColor: surface, borderRadius: 24, padding: 16 },
    videoTitle: { ...typography.titleSmall, color: text, marginBottom: 14 },
    videoAttribution: { ...typography.captionSmall, color: muted, marginTop: 4 },
    videoClose: { ...typography.caption, color: text, padding: 14, textAlign: 'center', textDecorationLine: 'underline' },
  })
}

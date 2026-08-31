import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../navigation/types'
import type { ExerciseDefinition, LocalProgressionSuggestion, PreviousPerformance, SessionExercise, SessionExerciseStatus, SetLog, SetLogInput, WorkoutSession } from '@training/training-domain'
import { effectiveExerciseDefinitionId, rankExerciseSubstitutions, selectPreviousPerformance, suggestProgression } from '@training/training-domain'
import type { RestTimerState } from '../model/restTimer'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { type ThemeColors, useTheme } from '../../../theme'
import { triggerHaptic } from '../../../theme/haptics'
import { ExerciseVideo } from '../../exercise-library/ExerciseVideo'
import { attributionLabel, resolveMediaAttribution } from '../../exercise-library/libraryState'
import { ThemedTextInput } from '../../../components/ThemedTextInput'

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
  const { session, history, library, restTimer, errors, busyKeys, onUpdateSet, onAddSet, onRemoveSet, onSetExerciseStatus, onUpdateExerciseNotes, onUpdateSessionNotes, onApplySuggestion, onSubstituteExercise, onUndoSubstitution, onPause, onResume, onComplete, onAbandon, onStartRest, onAdjustRest, onSkipRest } = props
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors, preferences.workoutHighContrast)
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [now, setNow] = useState(Date.now())
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [canLeave, setCanLeave] = useState(false)
  const [videoExercise, setVideoExercise] = useState<SessionExercise | null>(null)
  const [videoRetryKey, setVideoRetryKey] = useState(0)
  const noteSession = useRef(session?.id)
  const notifiedTimer = useRef('')
  const definitions = useMemo(() => new Map(library.map((exercise) => [exercise.id, exercise])), [library])

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { if (session && noteSession.current !== session.id) { noteSession.current = session.id; setNotes(session.notes) } }, [session])

  const remaining = restTimer ? Math.max(0, Math.ceil((restTimer.endsAt - (restTimer.paused ? restTimer.pausedAt ?? now : now)) / 1000)) : 0
  const timerKey = restTimer ? `${restTimer.sessionId}:${restTimer.setId}:${restTimer.endsAt}` : ''
  useEffect(() => {
    if (restTimer && !restTimer.paused && remaining === 0 && notifiedTimer.current !== timerKey) {
      notifiedTimer.current = timerKey
      void triggerHaptic('REST_TIMER_COMPLETE', preferences.hapticsEnabled)
      onSkipRest()
    }
  }, [onSkipRest, preferences.hapticsEnabled, remaining, restTimer, timerKey])

  usePreventRemove(Boolean(session) && !canLeave, ({ data }) => {
    Alert.alert('Sair da sessão?', 'Escolha como deseja deixar o treino.', [
      { text: 'Continuar treinando', style: 'cancel' },
      { text: session?.status === 'PAUSED' ? 'Sair pausada' : 'Pausar e sair', onPress: () => void (async () => { const success = session?.status === 'PAUSED' || await onPause(); if (!success) return; if (session?.status !== 'PAUSED') void triggerHaptic('SESSION_PAUSE', preferences.hapticsEnabled); setCanLeave(true); setTimeout(() => navigation.dispatch(data.action), 0) })() },
      { text: 'Abandonar', style: 'destructive', onPress: () => void (async () => { void triggerHaptic('DESTRUCTIVE_CONFIRM', preferences.hapticsEnabled); if (!await onAbandon()) return; setCanLeave(true); setTimeout(() => navigation.dispatch(data.action), 0) })() },
    ])
  })

  if (!session) return <Screen><View style={styles.empty}><Text style={styles.emptyTitle}>Nenhuma sessão ativa</Text><Text style={styles.muted}>Escolha um treino na ficha semanal.</Text><TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => navigation.navigate('MainTabs', { screen: 'Plan' })}><Text style={styles.primaryText}>Abrir ficha</Text></TouchableOpacity></View></Screen>

  const closeVideo = () => { setVideoExercise(null); setVideoRetryKey(0) }
  const videoMetadata = videoExercise ? resolveMediaAttribution({ author: videoExercise.primaryVideoAuthor, licenseName: videoExercise.primaryVideoLicenseName, licenseUrl: videoExercise.primaryVideoLicenseUrl, sourceUrl: videoExercise.primaryVideoSourceUrl }, {}) : null
  const videoAttribution = videoMetadata && Object.values(videoMetadata).some(Boolean) ? attributionLabel(videoMetadata) : videoExercise?.attribution || ''
  const sessionMeta = [
    `${session.completedSets} / ${session.totalPlannedSets} séries`,
    session.totalDurationSeconds > 0 ? `${Math.round(session.totalDurationSeconds / 60)} min` : null,
    session.totalVolume > 0 ? `${Math.round(session.totalVolume).toLocaleString('pt-BR')} kg` : null,
  ].filter(Boolean).join(' · ')

  return <>
    <ScreenScrollView contentContainerStyle={preferences.workoutHighContrast && { backgroundColor: colors.workout.background }} showsVerticalScrollIndicator={false}>
      <View style={[styles.sessionHeader, session.status === 'PAUSED' && styles.pausedHeader]}>
        <View style={styles.headerCopy}><Text style={styles.eyebrow}>{session.status === 'PAUSED' ? 'SESSÃO PAUSADA' : 'SESSÃO EM ANDAMENTO'}</Text><Text style={styles.title}>{session.workoutName}</Text><Text style={styles.headerMeta}>{sessionMeta}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busyKeys.has('session') }} disabled={busyKeys.has('session')} onPress={() => void (async () => { const resuming = session.status === 'PAUSED'; if (await (resuming ? onResume() : onPause())) void triggerHaptic(resuming ? 'SESSION_RESUME' : 'SESSION_PAUSE', preferences.hapticsEnabled) })()} style={styles.secondary}><Text style={styles.secondaryText}>{session.status === 'PAUSED' ? 'Continuar' : 'Pausar'}</Text></TouchableOpacity>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Progresso da sessão" accessibilityValue={{ min: 0, max: session.totalPlannedSets, now: session.completedSets, text: `${session.completedSets} de ${session.totalPlannedSets} séries` }} style={styles.progressTrack}><View style={[styles.progressFill, { width: session.totalPlannedSets ? `${Math.round(session.completedSets / session.totalPlannedSets * 100)}%` : '0%' }]} /></View>
      {remaining > 0 && <RestTimer remaining={remaining} onAdjust={onAdjustRest} onSkip={onSkipRest} />}
      {session.exercises.map((exercise, index) => <WorkoutExerciseCard key={exercise.id} exercise={exercise} index={index} previous={selectPreviousPerformance(history, effectiveExerciseDefinitionId(exercise), session.trainingPlanId)} definition={definitions.get(effectiveExerciseDefinitionId(exercise))} library={library} session={session} errors={errors} busyKeys={busyKeys} onUpdateSet={(setId, input) => onUpdateSet(exercise.id, setId, input)} onAddSet={() => onAddSet(exercise.id)} onRemoveSet={(setId) => onRemoveSet(exercise.id, setId)} onSetStatus={(status) => onSetExerciseStatus(exercise.id, status)} onUpdateNotes={(value) => onUpdateExerciseNotes(exercise.id, value)} onApplySuggestion={(suggestion) => onApplySuggestion(exercise.id, suggestion)} onSubstitute={(replacementId, reason) => onSubstituteExercise(exercise.id, replacementId, reason)} onUndoSubstitution={() => onUndoSubstitution(exercise.id)} onStartRest={(setId) => onStartRest(exercise.id, setId, exercise.restSeconds)} onOpenVideo={() => { setVideoRetryKey(0); setVideoExercise(exercise) }} />)}
      <FinishSection rpe={rpe} notes={notes} busy={busyKeys.has('session')} error={errors.session} onRpe={setRpe} onNotes={setNotes} onSaveNotes={onUpdateSessionNotes} onComplete={() => void (async () => { if (await onComplete(rpe ? toNumber(rpe) : null, notes)) { void triggerHaptic('SESSION_COMPLETE', preferences.hapticsEnabled); setCanLeave(true); setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' }), 0) } })()} onAbandon={() => Alert.alert('Abandonar sessão?', 'Os registros feitos serão preservados.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abandonar', style: 'destructive', onPress: () => void (async () => { void triggerHaptic('DESTRUCTIVE_CONFIRM', preferences.hapticsEnabled); if (await onAbandon()) { setCanLeave(true); setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' }), 0) } })() }])} />
    </ScreenScrollView>
    {videoExercise && <Modal visible transparent animationType="fade" onRequestClose={closeVideo}><Screen style={styles.videoBackdrop}><View accessibilityViewIsModal style={styles.videoSheet}><Text style={styles.videoTitle}>{videoExercise.name}</Text>{videoExercise.primaryVideoUrl && <ExerciseVideo key={videoRetryKey} url={videoExercise.primaryVideoUrl} posterUrl={videoExercise.primaryImageUrl} onRetry={() => setVideoRetryKey((value) => value + 1)} />}{!!videoAttribution && <Text style={styles.videoAttribution}>{videoAttribution}</Text>}{videoMetadata?.sourceUrl && <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(videoMetadata.sourceUrl!)} style={styles.textAction}><Text style={styles.videoLink}>Abrir fonte original</Text></TouchableOpacity>}{videoMetadata?.licenseUrl && <TouchableOpacity accessibilityRole="link" onPress={() => void Linking.openURL(videoMetadata.licenseUrl!)} style={styles.textAction}><Text style={styles.videoLink}>Consultar licença</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" onPress={closeVideo} style={styles.textAction}><Text style={styles.videoLink}>Fechar</Text></TouchableOpacity></View></Screen></Modal>}
  </>
}

function RestTimer({ remaining, onAdjust, onSkip }: { remaining: number; onAdjust: (seconds: number) => void; onSkip: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast)
  return <View accessibilityLabel={`Descanso: ${formatTime(remaining)} restantes`} accessibilityRole="timer" style={styles.timer}><View><Text style={styles.timerLabel}>DESCANSO</Text><Text style={styles.timerValue}>{formatTime(remaining)}</Text></View><View style={styles.timerActions}><TimerAction label="−15" onPress={() => onAdjust(-15)} /><TimerAction label="+15" onPress={() => onAdjust(15)} /><TimerAction label="Pular" onPress={onSkip} /></View></View>
}

function WorkoutExerciseCard({ exercise, index, previous, definition, library, session, errors, busyKeys, onUpdateSet, onAddSet, onRemoveSet, onSetStatus, onUpdateNotes, onApplySuggestion, onSubstitute, onUndoSubstitution, onStartRest, onOpenVideo }: { exercise: SessionExercise; index: number; previous: PreviousPerformance | null; definition: ExerciseDefinition | undefined; library: ExerciseDefinition[]; session: WorkoutSession; errors: Record<string, string>; busyKeys: Set<string>; onUpdateSet: (setId: number, input: SetLogInput) => Promise<boolean>; onAddSet: () => Promise<boolean>; onRemoveSet: (setId: number) => Promise<boolean>; onSetStatus: (status: SessionExerciseStatus) => Promise<boolean>; onUpdateNotes: (value: string) => Promise<boolean>; onApplySuggestion: (suggestion: LocalProgressionSuggestion) => Promise<boolean>; onSubstitute: (replacementId: number, reason: string) => Promise<boolean>; onUndoSubstitution: () => Promise<boolean>; onStartRest: (setId: number) => void; onOpenVideo: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [substitutionsOpen, setSubstitutionsOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)
  const substitutions = definition ? rankExerciseSubstitutions(definition, library).filter((candidate) => !session.exercises.some((item) => item.id !== exercise.id && effectiveExerciseDefinitionId(item) === candidate.exercise.id)).slice(0, 4) : []
  const suggestion = suggestProgression(exercise, previous, definition?.equipment.toLocaleLowerCase('pt-BR').includes('peso corporal') ?? false)
  const statusLabel = exercise.status === 'SKIPPED' ? 'Pulado' : exercise.sets.length && exercise.sets.every((set) => set.completed) ? 'Concluído' : 'Pendente'
  const timed = exercise.category === 'CARDIO' || exercise.timed
  return <View accessibilityLabel={`${exercise.name}. Estado: ${statusLabel}.`} style={styles.card}>
    <View style={styles.exerciseHeader}><Text style={styles.index}>{index + 1}</Text><View style={styles.exerciseCopy}><Text style={styles.exerciseName}>{exercise.substituteName ?? exercise.name}</Text><Text style={styles.muted}>{timed ? 'Duração' : `${exercise.plannedMinReps}–${exercise.plannedMaxReps} reps`} · {exercise.restSeconds}s descanso</Text><Text style={styles.muted}>Estado: {statusLabel}</Text>{exercise.substituteName && <Text style={styles.substitution}>Substituído: {exercise.substituteName}</Text>}</View><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mais opções para ${exercise.name}`} accessibilityState={{ expanded: moreOpen }} onPress={() => setMoreOpen((value) => !value)} style={styles.moreButton}><Text style={styles.moreButtonText}>Mais</Text></TouchableOpacity></View>
    {previous && <PreviousSummary previous={previous} expanded={historyOpen} onToggle={() => setHistoryOpen((value) => !value)} />}
    <View accessibilityLabel="Colunas do registro de séries" style={styles.setColumns}><Text style={styles.setColumnLabel}>SÉRIE</Text><Text style={styles.setColumnLabel}>{timed ? 'TEMPO' : 'KG · REPS'}</Text><Text style={styles.setColumnLabel}>CHECK</Text></View>
    {exercise.sets.map((set) => <WorkoutSetRow key={set.id} exercise={exercise} set={set} previous={previousSet(previous, set.setNumber)} busy={busyKeys.has(`set:${set.id}`)} error={errors[`set:${set.id}`]} onSave={(input) => onUpdateSet(set.id, input)} onRemove={() => onRemoveSet(set.id)} onStartRest={() => onStartRest(set.id)} />)}
    {!!errors[`exercise:${exercise.id}`] && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors[`exercise:${exercise.id}`]}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busyKeys.has(`exercise:${exercise.id}`) }} disabled={busyKeys.has(`exercise:${exercise.id}`)} style={styles.addSet} onPress={() => void onAddSet()}><Text style={styles.addSetText}>Adicionar série</Text></TouchableOpacity>
    {suggestion.type !== 'NO_HISTORY' && !suggestionDismissed && <Suggestion suggestion={suggestion} busy={busyKeys.has(`suggestion:${exercise.id}`)} onApply={async () => { if (await onApplySuggestion(suggestion)) setSuggestionDismissed(true) }} onDismiss={() => setSuggestionDismissed(true)} />}
    {moreOpen && <View style={styles.secondaryActions}>
      {exercise.primaryVideoUrl && <Action label="Ver execução" onPress={onOpenVideo} />}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: notesOpen }} onPress={() => setNotesOpen((value) => !value)} style={styles.action}><Text style={styles.actionText}>Notas do exercício</Text></TouchableOpacity>
      {notesOpen && <ExerciseNotesEditor exercise={exercise} busy={busyKeys.has(`exercise-note:${exercise.id}`)} onSave={onUpdateNotes} />}
      {exercise.substituteExerciseDefinitionId ? <Action label="Desfazer substituição" disabled={busyKeys.has(`substitution:${exercise.id}`)} onPress={() => void onUndoSubstitution()} /> : <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: substitutionsOpen, disabled: !substitutions.length }} disabled={!substitutions.length} onPress={() => setSubstitutionsOpen((value) => !value)} style={styles.action}><Text style={styles.actionText}>Substituir exercício</Text></TouchableOpacity>}
      {substitutionsOpen && substitutions.map((candidate) => <TouchableOpacity key={candidate.exercise.id} accessibilityRole="button" disabled={busyKeys.has(`substitution:${exercise.id}`)} onPress={() => void (async () => { if (await onSubstitute(candidate.exercise.id, candidate.reason)) setSubstitutionsOpen(false) })()} style={styles.substitutionOption}><Text style={styles.substitutionName}>{candidate.exercise.name}</Text><Text style={styles.referenceText}>{candidate.reason}</Text></TouchableOpacity>)}
      <Action label={exercise.status === 'SKIPPED' ? 'Desfazer pulo' : 'Pular exercício'} disabled={busyKeys.has(`exercise:${exercise.id}`)} onPress={() => void onSetStatus(exercise.status === 'SKIPPED' ? 'PENDING' : 'SKIPPED')} />
    </View>}
  </View>
}

function PreviousSummary({ previous, expanded, onToggle }: { previous: PreviousPerformance; expanded: boolean; onToggle: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast)
  const parts = [previous.load != null ? `${formatNumber(previous.load)} kg` : null, previous.reps.length ? previous.reps.join(' / ') : null, previous.lastRpe != null ? `RPE ${formatNumber(previous.lastRpe)}` : null].filter(Boolean)
  return <View style={styles.previous}><Text style={styles.previousSummary}>Última: {parts.length ? parts.join(' · ') : `${previous.completedSetCount} séries`}</Text><TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.previousAction}><Text style={styles.utilityActionText}>{expanded ? 'Menos detalhes' : 'Ver detalhes'}</Text></TouchableOpacity>{expanded && <View style={styles.previousDetails}><Text style={styles.referenceText}>{new Date(previous.completedAt).toLocaleDateString('pt-BR')} · {previous.completedSetCount} séries concluídas</Text>{previous.load != null && <Text style={styles.referenceText}>Carga: {formatNumber(previous.load)} kg</Text>}{previous.reps.length > 0 && <Text style={styles.referenceText}>Reps: {previous.reps.join(' · ')}</Text>}{previous.lastRpe != null && <Text style={styles.referenceText}>RPE: {formatNumber(previous.lastRpe)}</Text>}{previous.annotation && <Text style={styles.referenceText}>Nota: {previous.annotation}</Text>}</View>}</View>
}

function WorkoutSetRow({ exercise, set, previous, busy, error, onSave, onRemove, onStartRest }: { exercise: SessionExercise; set: SetLog; previous: string | null; busy: boolean; error?: string; onSave: (input: SetLogInput) => Promise<boolean>; onRemove: () => Promise<boolean>; onStartRest: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast)
  const [reps, setReps] = useState(String(set.reps)); const [load, setLoad] = useState(String(set.load)); const [duration, setDuration] = useState(String(set.durationSeconds)); const [distance, setDistance] = useState(String(set.distance)); const [rpe, setRpe] = useState(set.rpe == null ? '' : String(set.rpe)); const [notes, setNotes] = useState(set.notes); const [detailsOpen, setDetailsOpen] = useState(false)
  const timed = exercise.category === 'CARDIO' || exercise.timed; const cardio = exercise.category === 'CARDIO'
  const input = (completed: boolean): SetLogInput => ({ reps: toNumber(reps), load: toNumber(load), durationSeconds: toNumber(duration), distance: toNumber(distance), rpe: rpe ? toNumber(rpe) : null, completed, notes })
  const complete = async () => { const completing = !set.completed; if (await onSave(input(completing)) && completing) { void triggerHaptic('SET_COMPLETE', preferences.hapticsEnabled); onStartRest() } }
  return <View accessibilityLabel={`Série ${set.setNumber}. ${set.completed ? 'Concluída' : 'Pendente'}.`} style={[styles.setRow, set.completed && styles.completedRow]}>
    <View style={styles.setNumberBlock}><Text style={styles.setNumber}>{set.setNumber}</Text>{previous && <Text style={styles.previousSet}>{previous}</Text>}</View>
    <View style={styles.setInputs}>{!timed && <SetField label={`Carga da série ${set.setNumber}`} value={load} onChange={setLoad} decimal />}{!timed && <SetField label={`Repetições da série ${set.setNumber}`} value={reps} onChange={setReps} />}{timed && <SetField label={`Duração da série ${set.setNumber}`} value={duration} onChange={setDuration} />}{cardio && <SetField label={`Distância da série ${set.setNumber}`} value={distance} onChange={setDistance} decimal />}</View>
    <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Concluir série ${set.setNumber}`} accessibilityState={{ disabled: busy, checked: set.completed }} disabled={busy} style={[styles.check, set.completed && styles.checked]} onPress={() => void complete()}><Text style={[styles.checkText, set.completed && styles.checkedText]}>{set.completed ? '✓' : 'Concluir'}</Text></TouchableOpacity>
    <View style={styles.setUtilities}><TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen((value) => !value)} style={styles.utilityAction}><Text style={styles.utilityActionText}>{detailsOpen ? 'Menos detalhes' : 'RPE e notas'}</Text></TouchableOpacity>{!set.completed && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void onSave(input(false))} style={styles.utilityAction}><Text style={styles.utilityActionText}>{busy ? 'Salvando…' : 'Salvar sem concluir'}</Text></TouchableOpacity>}{set.manuallyAdded && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void onRemove()} style={styles.utilityAction}><Text style={styles.removeSet}>Remover</Text></TouchableOpacity>}</View>
    {detailsOpen && <View style={styles.setDetails}><SetField label={`RPE da série ${set.setNumber}`} value={rpe} onChange={setRpe} decimal /><ThemedTextInput accessibilityLabel={`Observação da série ${set.setNumber}`} value={notes} onChangeText={setNotes} placeholder="Observação opcional" maxLength={500} style={styles.setNotes} /></View>}
    {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>
}

function Suggestion({ suggestion, busy, onApply, onDismiss }: { suggestion: LocalProgressionSuggestion; busy: boolean; onApply: () => Promise<void>; onDismiss: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast)
  const proposal = suggestion.proposedLoad != null ? `${formatNumber(suggestion.proposedLoad)} kg` : suggestion.proposedDurationSeconds != null ? `${suggestion.proposedDurationSeconds} s` : suggestion.proposedReps != null ? `${suggestion.proposedReps} reps` : 'Manter alvo'
  return <View accessibilityLabel="Sugestão local disponível" style={styles.suggestion}><View style={styles.suggestionCopy}><Text style={styles.suggestionTitle}>Sugestão: {proposal}</Text><Text numberOfLines={2} style={styles.referenceText}>{suggestion.reason}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void onApply()} style={styles.applySuggestion}><Text style={styles.applySuggestionText}>Aplicar</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={onDismiss} style={styles.dismissSuggestion}><Text style={styles.utilityActionText}>Dispensar</Text></TouchableOpacity></View>
}

function ExerciseNotesEditor({ exercise, busy, onSave }: { exercise: SessionExercise; busy: boolean; onSave: (notes: string) => Promise<boolean> }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast); const [notes, setNotes] = useState(exercise.userNotes); const [saved, setSaved] = useState(false)
  useEffect(() => setNotes(exercise.userNotes), [exercise.userNotes])
  return <View style={styles.notesEditor}><ThemedTextInput accessibilityLabel={`Anotações do exercício ${exercise.name}`} value={notes} onChangeText={(value) => { setNotes(value.slice(0, 1_000)); setSaved(false) }} multiline maxLength={1_000} placeholder="Anotação desta sessão" style={styles.setNotes} /><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void (async () => setSaved(await onSave(notes)))()} style={styles.utilityAction}><Text style={styles.utilityActionText}>{busy ? 'Salvando…' : 'Salvar anotação'}</Text></TouchableOpacity>{saved && <Text accessibilityLiveRegion="polite" style={styles.saved}>Anotação salva.</Text>}</View>
}

function FinishSection({ rpe, notes, busy, error, onRpe, onNotes, onSaveNotes, onComplete, onAbandon }: { rpe: string; notes: string; busy: boolean; error?: string; onRpe: (value: string) => void; onNotes: (value: string) => void; onSaveNotes: (value: string) => Promise<boolean>; onComplete: () => void; onAbandon: () => void }) {
  const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast); const [saved, setSaved] = useState(false)
  return <View style={styles.finish}><Text style={styles.finishTitle}>Resumo</Text><ThemedTextInput accessibilityLabel="RPE geral" value={rpe} onChangeText={onRpe} keyboardType="decimal-pad" placeholder="RPE geral (1–10)" style={styles.input} /><ThemedTextInput accessibilityLabel="Anotações da sessão" value={notes} onChangeText={(value) => { onNotes(value.slice(0, 2_000)); setSaved(false) }} placeholder="Anotações da sessão" multiline maxLength={2_000} style={styles.input} /><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={styles.utilityAction} onPress={() => void (async () => setSaved(await onSaveNotes(notes)))()}><Text style={styles.utilityActionText}>Salvar anotação</Text></TouchableOpacity>{saved && <Text accessibilityLiveRegion="polite" style={styles.saved}>Anotação salva.</Text>}{!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}<TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={styles.primary} onPress={onComplete}><Text style={styles.primaryText}>Concluir treino</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} style={styles.textAction} onPress={onAbandon}><Text style={styles.abandon}>Abandonar sessão</Text></TouchableOpacity></View>
}

function SetField({ label, value, onChange, decimal = false }: { label: string; value: string; onChange: (value: string) => void; decimal?: boolean }) { const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast); return <View style={styles.field}><ThemedTextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} selectTextOnFocus style={styles.setInput} /></View> }
function TimerAction({ label, onPress }: { label: string; onPress: () => void }) { const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast); return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.timerAction}><Text style={styles.timerActionText}>{label}</Text></TouchableOpacity> }
function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { const { colors, preferences } = useTheme(); const styles = createStyles(colors, preferences.workoutHighContrast); return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.action}><Text style={styles.actionText}>{label}</Text></TouchableOpacity> }
function previousSet(previous: PreviousPerformance | null, number: number) { if (!previous || previous.load == null || previous.reps[number - 1] == null) return null; return `${formatNumber(previous.load)} × ${previous.reps[number - 1]}` }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toLocaleString('pt-BR') }
function toNumber(value: string) { const parsed = Number(value.replace(',', '.')); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 }
function formatTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }

const createStyles = (colors: ThemeColors, highContrast = false) => {
  const workout = highContrast ? colors.workout : null; const background = workout?.background ?? colors.background; const surface = workout?.surface ?? colors.surface; const border = workout?.border ?? colors.border; const text = workout?.text ?? colors.textPrimary; const secondaryText = workout?.textSecondary ?? colors.textSecondary; const completed = workout?.completed ?? colors.success; const onCompleted = workout?.onCompleted ?? colors.background; const danger = workout?.danger ?? colors.danger; const borderWidth = highContrast ? 2 : 1
  return StyleSheet.create({
    sessionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 8, paddingHorizontal: 4 }, pausedHeader: { backgroundColor: surface, borderColor: colors.warning, borderRadius: 16, borderWidth, paddingVertical: 8 }, progressTrack: { backgroundColor: highContrast ? surface : colors.surfaceSecondary, borderRadius: 3, height: 6, marginBottom: 14, overflow: 'hidden' }, progressFill: { backgroundColor: colors.primary, height: 6 }, headerCopy: { flex: 1, minWidth: 0 }, eyebrow: { color: secondaryText, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { color: text, fontSize: 26, fontWeight: '700', lineHeight: 32, marginTop: 4 }, headerMeta: { color: secondaryText, fontSize: 14, fontVariant: ['tabular-nums'], lineHeight: 20, marginTop: 3 }, secondary: { alignItems: 'center', borderColor: border, borderRadius: 14, borderWidth, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 }, secondaryText: { color: text, fontSize: 14, fontWeight: '700' },
    timer: { alignItems: 'center', backgroundColor: workout?.timer ?? colors.textPrimary, borderColor: highContrast ? border : undefined, borderRadius: 22, borderWidth: highContrast ? 2 : 0, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 12, padding: 18 }, timerLabel: { color: workout?.timerText ?? colors.background, fontSize: 13, fontWeight: '700', letterSpacing: 1 }, timerValue: { color: workout?.timerText ?? colors.background, fontSize: 36, fontVariant: ['tabular-nums'], fontWeight: '700', lineHeight: 43 }, timerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, timerAction: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48, paddingHorizontal: 4 }, timerActionText: { color: workout?.timerText ?? colors.background, fontSize: 14, fontWeight: '700' },
    card: { backgroundColor: surface, borderColor: highContrast ? border : undefined, borderRadius: 21, borderWidth: highContrast ? 2 : 0, marginBottom: 12, overflow: 'hidden' }, exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, padding: 16 }, index: { backgroundColor: colors.primary, borderRadius: 13, color: colors.onPrimary, fontSize: 16, fontWeight: '700', minWidth: 48, overflow: 'hidden', padding: 14, textAlign: 'center' }, exerciseCopy: { flex: 1, minWidth: 0 }, exerciseName: { color: text, fontSize: 19, fontWeight: '700', lineHeight: 25 }, muted: { color: secondaryText, fontSize: 14, lineHeight: 20, marginTop: 3 }, substitution: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 3 }, moreButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 6 }, moreButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    previous: { backgroundColor: highContrast ? background : colors.surfaceSecondary, borderTopColor: border, borderTopWidth: borderWidth, paddingHorizontal: 16, paddingVertical: 10 }, previousSummary: { color: text, fontSize: 14, fontWeight: '600', lineHeight: 20 }, previousAction: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' }, previousDetails: { gap: 2, paddingBottom: 2 }, referenceText: { color: secondaryText, fontSize: 13, lineHeight: 19 },
    setColumns: { alignItems: 'center', borderTopColor: border, borderTopWidth: borderWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 }, setColumnLabel: { color: secondaryText, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }, setRow: { alignItems: 'center', borderTopColor: border, borderTopWidth: borderWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }, completedRow: { backgroundColor: highContrast ? surface : colors.successSurface }, setNumberBlock: { alignItems: 'center', minHeight: 48, justifyContent: 'center', width: 42 }, setNumber: { color: text, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '700' }, previousSet: { color: secondaryText, fontSize: 12, marginTop: 1 }, setInputs: { flex: 1, flexDirection: 'row', gap: 6, minWidth: 148 }, field: { flex: 1, minWidth: 0 }, setInput: { backgroundColor: highContrast ? surface : colors.surfaceSecondary, borderColor: border, borderRadius: 10, borderWidth, color: text, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '700', minHeight: 48, paddingHorizontal: 9 }, check: { alignItems: 'center', backgroundColor: workout?.pending ?? colors.surfaceSecondary, borderColor: border, borderRadius: 12, borderWidth, justifyContent: 'center', minHeight: 48, minWidth: 58, paddingHorizontal: 8 }, checked: { backgroundColor: completed, borderColor: highContrast ? border : completed }, checkText: { color: text, fontSize: 12, fontWeight: '700' }, checkedText: { color: onCompleted, fontSize: 22 }, setUtilities: { flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 50 }, utilityAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 }, utilityActionText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, removeSet: { color: danger, fontSize: 13, fontWeight: '700' }, setDetails: { flexBasis: '100%', gap: 8, marginLeft: 50 }, setNotes: { backgroundColor: highContrast ? surface : colors.surfaceSecondary, borderColor: border, borderRadius: 10, borderWidth, color: text, fontSize: 16, minHeight: 56, paddingHorizontal: 10 }, error: { color: danger, flexBasis: '100%', fontSize: 14, lineHeight: 20 },
    addSet: { alignItems: 'center', borderTopColor: border, borderTopWidth: borderWidth, justifyContent: 'center', minHeight: 56 }, addSetText: { color: colors.primary, fontSize: 14, fontWeight: '700' }, suggestion: { alignItems: 'center', backgroundColor: highContrast ? background : colors.surfaceSecondary, borderTopColor: border, borderTopWidth: borderWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }, suggestionCopy: { flex: 1, minWidth: 140 }, suggestionTitle: { color: text, fontSize: 14, fontWeight: '700' }, applySuggestion: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 }, applySuggestionText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' }, dismissSuggestion: { minHeight: 48, justifyContent: 'center' }, secondaryActions: { backgroundColor: highContrast ? background : colors.surfaceSecondary, borderTopColor: border, borderTopWidth: borderWidth, gap: 4, padding: 12 }, action: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 4 }, actionText: { color: text, fontSize: 14, fontWeight: '600' }, substitutionOption: { borderColor: border, borderRadius: 10, borderWidth, minHeight: 56, padding: 10 }, substitutionName: { color: text, fontSize: 14, fontWeight: '700' }, notesEditor: { gap: 6, paddingBottom: 4 },
    finish: { backgroundColor: surface, borderColor: highContrast ? border : undefined, borderRadius: 22, borderWidth: highContrast ? 2 : 0, gap: 10, marginTop: 4, padding: 16 }, finishTitle: { color: text, fontSize: 20, fontWeight: '700' }, input: { backgroundColor: highContrast ? background : colors.surfaceSecondary, borderColor: border, borderRadius: 14, borderWidth, color: text, fontSize: 16, minHeight: 56, paddingHorizontal: 14 }, primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 }, primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' }, textAction: { justifyContent: 'center', minHeight: 48 }, abandon: { color: danger, fontSize: 14, fontWeight: '700', padding: 12, textAlign: 'center' }, saved: { color: completed, fontSize: 13, fontWeight: '700' }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 }, emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginBottom: 6 }, videoBackdrop: { backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: 18 }, videoSheet: { backgroundColor: colors.surface, borderRadius: 24, padding: 16 }, videoTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 14 }, videoAttribution: { color: colors.gray500, fontSize: 12, lineHeight: 16, marginTop: 4 }, videoLink: { color: colors.primary, fontSize: 14, fontWeight: '700', paddingVertical: 8 },
  })
}

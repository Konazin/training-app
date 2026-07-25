import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native'
import type { SetLog, WorkoutSession } from '../models/training'
import { shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  session: WorkoutSession | null
  onOpenPlans: () => void
  onUpdateSet: (exerciseId: number, setId: number, payload: { reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string }) => Promise<boolean>
  onSkip: (exerciseId: number, status: 'PENDING' | 'SKIPPED') => Promise<boolean>
  onComplete: (rpe: number | null, notes: string) => Promise<boolean>
  onAbandon: () => Promise<boolean>
}
export function SessionScreen({ session, onOpenPlans, onUpdateSet, onSkip, onComplete, onAbandon }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [now, setNow] = useState(Date.now())
  const [restEnd, setRestEnd] = useState(0)
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const remaining = Math.max(0, Math.ceil((restEnd - now) / 1000))
  useEffect(() => { if (restEnd > 0 && remaining === 0) { Vibration.vibrate([0, 180, 80, 180]); setRestEnd(0) } }, [remaining, restEnd])
  function format(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
  function toggleSet(exerciseId: number, set: SetLog, rest: number) {
    void onUpdateSet(exerciseId, set.id, { reps: set.reps, load: set.load, durationSeconds: set.durationSeconds, distance: set.distance, rpe: set.rpe, completed: !set.completed, notes: set.notes })
    if (!set.completed && rest) setRestEnd(Date.now() + rest * 1000)
  }
  if (!session) return <View style={styles.empty}><Text style={styles.emptyTitle}>Nenhuma sessão ativa</Text><Text style={styles.muted}>Escolha um treino na ficha semanal.</Text><TouchableOpacity style={styles.primary} onPress={onOpenPlans}><Text style={styles.primaryText}>Abrir fichas</Text></TouchableOpacity></View>
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.eyebrow}>SESSÃO EM ANDAMENTO</Text><Text style={styles.title}>{session.workoutName}</Text>
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricLabel}>PROGRESSO</Text><Text style={styles.metricValue}>{Math.round(session.completedSets / session.totalPlannedSets * 100)}%</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>VOLUME</Text><Text style={styles.metricValue}>{session.totalVolume}kg</Text></View></View>
    {remaining > 0 && <View style={styles.timer}><View><Text style={styles.timerLabel}>DESCANSO</Text><Text style={styles.timerValue}>{format(remaining)}</Text></View><View style={styles.timerActions}><TouchableOpacity onPress={() => setRestEnd(value => Math.max(Date.now(), value - 15000))}><Text style={styles.timerAction}>−15</Text></TouchableOpacity><TouchableOpacity onPress={() => setRestEnd(value => value + 15000)}><Text style={styles.timerAction}>+15</Text></TouchableOpacity><TouchableOpacity onPress={() => setRestEnd(0)}><Text style={styles.timerAction}>Pular</Text></TouchableOpacity></View></View>}
    {session.exercises.map((exercise, index) => <View key={exercise.id} style={styles.card}><View style={styles.exerciseHeader}><Text style={styles.index}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.muted}>{exercise.plannedMinReps}–{exercise.plannedMaxReps} reps · {exercise.restSeconds}s</Text></View><TouchableOpacity onPress={() => void onSkip(exercise.id, exercise.status === 'SKIPPED' ? 'PENDING' : 'SKIPPED')}><Text style={styles.skip}>{exercise.status === 'SKIPPED' ? 'Desfazer' : 'Pular'}</Text></TouchableOpacity></View>
      {exercise.sets.map(set => <View key={set.id} style={styles.setRow}><Text style={styles.setNumber}>{set.setNumber}</Text><View style={styles.setValue}><Text style={styles.setLabel}>REPS</Text><Text style={styles.setText}>{set.reps}</Text></View><View style={styles.setValue}><Text style={styles.setLabel}>CARGA</Text><Text style={styles.setText}>{set.load}kg</Text></View><TouchableOpacity style={[styles.check, set.completed && styles.checked]} onPress={() => toggleSet(exercise.id, set, exercise.restSeconds)}><Text style={[styles.checkText, set.completed && { color: '#fff' }]}>{set.completed ? '✓' : '○'}</Text></TouchableOpacity></View>)}
    </View>)}
    <View style={styles.finish}><TextInput value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" placeholder="RPE geral (1–10)" placeholderTextColor={colors.gray400} style={styles.input} /><TextInput value={notes} onChangeText={setNotes} placeholder="Observações da sessão" placeholderTextColor={colors.gray400} style={styles.input} /><TouchableOpacity style={styles.primary} onPress={() => void onComplete(rpe ? Number(rpe) : null, notes)}><Text style={styles.primaryText}>Concluir e salvar</Text></TouchableOpacity><TouchableOpacity onPress={() => Alert.alert('Abandonar sessão?', 'Os registros feitos serão preservados.', [{ text: 'Cancelar' }, { text: 'Abandonar', style: 'destructive', onPress: () => void onAbandon() }])}><Text style={styles.abandon}>Abandonar sessão</Text></TouchableOpacity></View>
  </ScrollView>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 125 }, eyebrow: { color: colors.gray400, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 }, title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -1, marginBottom: 18, marginTop: 7 },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 10 }, metric: { backgroundColor: colors.card, borderRadius: 18, flex: 1, padding: 14 }, metricLabel: { color: colors.gray400, fontSize: 8 }, metricValue: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 6 },
  timer: { alignItems: 'center', backgroundColor: colors.nearBlack, borderRadius: 22, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 17 }, timerLabel: { color: '#858585', fontSize: 8, fontWeight: '800' }, timerValue: { color: '#fff', fontSize: 30, fontWeight: '700', marginTop: 3 }, timerActions: { flexDirection: 'row', gap: 8 }, timerAction: { color: '#fff', fontSize: 10, fontWeight: '700', padding: 8 },
  card: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 21, borderWidth: 1, marginBottom: 10, overflow: 'hidden' }, exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, padding: 14 }, index: { backgroundColor: colors.nearBlack, borderRadius: 13, color: '#fff', fontSize: 10, fontWeight: '800', overflow: 'hidden', padding: 12 }, exerciseName: { color: colors.ink, fontSize: 12, fontWeight: '700' }, muted: { color: colors.gray500, fontSize: 9, marginTop: 4 }, skip: { color: colors.gray500, fontSize: 9, fontWeight: '700', padding: 8 },
  setRow: { alignItems: 'center', borderTopColor: colors.gray100, borderTopWidth: 1, flexDirection: 'row', gap: 10, padding: 10 }, setNumber: { color: colors.gray500, fontSize: 10, fontWeight: '800', textAlign: 'center', width: 25 }, setValue: { flex: 1 }, setLabel: { color: colors.gray400, fontSize: 7 }, setText: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 2 }, check: { alignItems: 'center', borderColor: colors.gray200, borderRadius: 13, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, checked: { backgroundColor: '#059669', borderColor: '#059669' }, checkText: { color: colors.ink, fontSize: 18 },
  finish: { backgroundColor: colors.card, borderRadius: 22, gap: 9, marginTop: 5, padding: 14 }, input: { backgroundColor: colors.surface, borderRadius: 14, color: colors.ink, minHeight: 48, paddingHorizontal: 13 }, primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', minHeight: 52, paddingHorizontal: 20 }, primaryText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' }, abandon: { color: colors.danger, fontSize: 10, fontWeight: '700', padding: 12, textAlign: 'center' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 }, emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginBottom: 6 },
})

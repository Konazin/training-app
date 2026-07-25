import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import type { ExerciseDefinition, TrainingPlan, TrainingPlanDay } from '../models/training'
import { shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  plans: TrainingPlan[]
  selectedPlan: TrainingPlan | undefined
  library: ExerciseDefinition[]
  loading: boolean
  onSelectPlan: (id: number) => void
  onCreate: (input: { name: string; description: string; category: string; difficulty: string }) => Promise<boolean>
  onActivate: (id: number) => Promise<boolean>
  onUpdateDay: (planId: number, dayId: number, payload: { title: string; description: string; restDay: boolean; estimatedDurationMinutes: number; notes: string }) => Promise<boolean>
  onAddExercise: (planId: number, dayId: number, exerciseId: number) => Promise<boolean>
  onAddRestActivity: (planId: number, dayId: number, name: string) => Promise<boolean>
  onStart: (planId: number, dayId: number) => Promise<boolean>
}
const labels: Record<string, string> = { MONDAY: 'Seg', TUESDAY: 'Ter', WEDNESDAY: 'Qua', THURSDAY: 'Qui', FRIDAY: 'Sex', SATURDAY: 'Sáb', SUNDAY: 'Dom' }

export function WeeklyPlanScreen({ plans, selectedPlan, library, loading, onSelectPlan, onCreate, onActivate, onUpdateDay, onAddExercise, onAddRestActivity, onStart }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [dayId, setDayId] = useState<number | null>(null)
  const [activity, setActivity] = useState('')
  const [newPlanName, setNewPlanName] = useState('')
  const day = useMemo(() => selectedPlan?.days.find(item => item.id === dayId) ?? selectedPlan?.days[0], [dayId, selectedPlan])
  useEffect(() => { if (selectedPlan && !selectedPlan.days.some(item => item.id === dayId)) setDayId(selectedPlan.days[0]?.id ?? null) }, [dayId, selectedPlan])
  function toggleRest(target: TrainingPlanDay) {
    if (!selectedPlan) return
    if (!target.restDay && target.exercises.length) {
      Alert.alert('Dia com exercícios', 'Remova os exercícios antes de marcar este dia como descanso.')
      return
    }
    void onUpdateDay(selectedPlan.id, target.id, { title: target.title, description: target.description, restDay: !target.restDay, estimatedDurationMinutes: target.estimatedDurationMinutes, notes: target.notes })
  }
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="Planejamento semanal" title={'Ficha\nativa'} description="Treinos e descansos organizados de segunda a domingo." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planList}>
        {plans.filter(item => !item.archived).map(plan => <TouchableOpacity key={plan.id} style={[styles.planChip, selectedPlan?.id === plan.id && styles.planChipActive]} onPress={() => onSelectPlan(plan.id)}><Text style={[styles.planChipText, selectedPlan?.id === plan.id && styles.inverse]}>{plan.name}</Text><Text style={styles.planChipMeta}>{plan.active ? '● ativa' : plan.category}</Text></TouchableOpacity>)}
      </ScrollView>
      {!selectedPlan ? <View style={styles.empty}><Text style={styles.title}>Crie uma ficha para começar</Text><TextInput value={newPlanName} onChangeText={setNewPlanName} placeholder="Nome da ficha semanal" placeholderTextColor={colors.gray400} style={[styles.input, { marginTop: 16, width: '100%' }]} /><TouchableOpacity disabled={!newPlanName.trim() || loading} style={[styles.primary, { marginTop: 8, width: '100%' }]} onPress={() => void onCreate({ name: newPlanName, description: '', category: 'Treino semanal', difficulty: 'Iniciante' })}><Text style={styles.primaryText}>Criar semana</Text></TouchableOpacity></View> : <>
        <View style={styles.planHeader}><View style={{ flex: 1 }}><Text style={styles.title}>{selectedPlan.name}</Text><Text style={styles.muted}>{selectedPlan.description}</Text></View>{!selectedPlan.active && <TouchableOpacity style={styles.smallButton} onPress={() => void onActivate(selectedPlan.id)}><Text style={styles.smallButtonText}>Ativar</Text></TouchableOpacity>}</View>
        <View style={styles.week}>{selectedPlan.days.map(item => <TouchableOpacity key={item.id} style={[styles.dayButton, day?.id === item.id && styles.dayButtonActive]} onPress={() => setDayId(item.id)}><Text style={[styles.dayLabel, day?.id === item.id && styles.inverse]}>{labels[item.weekday]}</Text><Text style={[styles.daySymbol, item.restDay && styles.rest]}> {item.restDay ? '○' : '●'} </Text></TouchableOpacity>)}</View>
        {!!day && <View style={styles.card}>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{labels[day.weekday]}</Text><Text style={styles.title}>{day.restDay ? 'Dia de descanso' : day.title || 'Treino a definir'}</Text></View><TouchableOpacity style={styles.toggle} onPress={() => toggleRest(day)}><Text style={styles.toggleText}>{day.restDay ? 'Virar treino' : 'Marcar descanso'}</Text></TouchableOpacity></View>
          {day.restDay ? <>
            <Text style={styles.help}>As atividades abaixo são opcionais. Descansar completamente também é válido.</Text>
            {day.restActivities.map(item => <View key={item.id} style={styles.item}><Text style={styles.itemIndex}>○</Text><View style={{ flex: 1 }}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.muted}>{item.estimatedDurationMinutes} min · opcional</Text></View></View>)}
            <View style={styles.addRow}><TextInput value={activity} onChangeText={setActivity} placeholder="Mobilidade opcional" placeholderTextColor={colors.gray400} style={styles.input} /><TouchableOpacity style={styles.add} onPress={() => { if (activity.trim()) { void onAddRestActivity(selectedPlan.id, day.id, activity); setActivity('') } }}><Text style={styles.addText}>＋</Text></TouchableOpacity></View>
          </> : <>
            {day.exercises.map((item, index) => <View key={item.id} style={styles.item}><Text style={styles.itemIndex}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.itemName}>{item.exercise.name}</Text><Text style={styles.muted}>{item.sets} × {item.minReps}–{item.maxReps} · {item.restSeconds}s</Text></View></View>)}
            <Text style={styles.sectionLabel}>ADICIONAR DA BIBLIOTECA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{library.filter(item => !item.archived).slice(0, 12).map(exercise => <TouchableOpacity key={exercise.id} style={styles.exerciseChip} onPress={() => void onAddExercise(selectedPlan.id, day.id, exercise.id)}><Text style={styles.exerciseChipName}>{exercise.name}</Text><Text style={styles.muted}>{exercise.primaryMuscleGroup}</Text></TouchableOpacity>)}</ScrollView>
            {!!day.exercises.length && <TouchableOpacity disabled={loading} style={styles.start} onPress={() => void onStart(selectedPlan.id, day.id)}><Text style={styles.startText}>▶  Iniciar treino</Text></TouchableOpacity>}
          </>}
        </View>}
      </>}
    </ScrollView>
  )
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 125 }, planList: { gap: 8, paddingBottom: 16 },
  planChip: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 16, borderWidth: 1, minWidth: 150, padding: 12 },
  planChipActive: { backgroundColor: colors.nearBlack }, planChipText: { color: colors.ink, fontSize: 11, fontWeight: '700' }, planChipMeta: { color: colors.gray500, fontSize: 8, marginTop: 4 }, inverse: { color: '#fff' },
  planHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 13 }, title: { color: colors.ink, fontSize: 17, fontWeight: '700' }, muted: { color: colors.gray500, fontSize: 9, lineHeight: 14, marginTop: 4 },
  smallButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 12 }, smallButtonText: { color: colors.onPrimary, fontSize: 9, fontWeight: '800' },
  week: { flexDirection: 'row', gap: 4, marginBottom: 12 }, dayButton: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flex: 1, paddingVertical: 10 }, dayButtonActive: { backgroundColor: colors.nearBlack }, dayLabel: { color: colors.ink, fontSize: 8, fontWeight: '800' }, daySymbol: { color: colors.gray400, fontSize: 8, marginTop: 4 }, rest: { color: '#38bdf8' },
  card: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 23, borderWidth: 1, padding: 16 }, row: { alignItems: 'center', flexDirection: 'row', gap: 8 }, eyebrow: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 }, toggle: { backgroundColor: colors.gray100, borderRadius: 14, padding: 11 }, toggleText: { color: colors.ink, fontSize: 8, fontWeight: '700' }, help: { color: colors.gray500, fontSize: 10, lineHeight: 16, marginVertical: 14 },
  item: { alignItems: 'center', borderTopColor: colors.gray100, borderTopWidth: 1, flexDirection: 'row', gap: 11, paddingVertical: 12 }, itemIndex: { color: colors.gray500, fontSize: 10, fontWeight: '800', width: 24 }, itemName: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 7, marginTop: 12 }, input: { backgroundColor: colors.surface, borderRadius: 15, color: colors.ink, flex: 1, minHeight: 48, paddingHorizontal: 13 }, add: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', width: 48 }, addText: { color: colors.onPrimary, fontSize: 18 },
  sectionLabel: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.3, marginBottom: 9, marginTop: 15 }, exerciseChip: { backgroundColor: colors.gray100, borderRadius: 15, marginRight: 7, padding: 11, width: 145 }, exerciseChipName: { color: colors.ink, fontSize: 9, fontWeight: '700' },
  start: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', marginTop: 15, minHeight: 52 }, startText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' }, empty: { alignItems: 'center', minHeight: 280, justifyContent: 'center' },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', minHeight: 52 }, primaryText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
})

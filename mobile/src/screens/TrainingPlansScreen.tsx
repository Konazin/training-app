import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
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
import type { TrainingPlan, TrainingPlanInput } from '../models/training'
import { shared, type ThemeColors, useTheme } from '../theme'

interface Props {
  plans: TrainingPlan[]
  selectedPlan: TrainingPlan | undefined
  loading: boolean
  onSelect: (id: number) => void
  onCreate: (input: TrainingPlanInput) => Promise<boolean>
  onRemove: (id: number) => Promise<boolean>
  onRemoveExercise: (planId: number, exerciseId: number) => Promise<boolean>
  onAddExercise: (planId: number) => void
}

export function TrainingPlansScreen({
  plans,
  selectedPlan,
  loading,
  onSelect,
  onCreate,
  onRemove,
  onRemoveExercise,
  onAddExercise,
}: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('Iniciante')
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim() || !category.trim()) {
      setError('Preencha o nome e a categoria da ficha.')
      return
    }
    setError('')
    const success = await onCreate({ name, description, category, difficulty })
    if (success) {
      setName('')
      setDescription('')
      setCategory('')
      setDifficulty('Iniciante')
      setShowForm(false)
    }
  }

  function confirmPlanRemoval(plan: TrainingPlan) {
    Alert.alert('Excluir ficha', `Remover “${plan.name}” e todos os exercícios?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void onRemove(plan.id) },
    ])
  }

  function confirmExerciseRemoval(exerciseId: number, exerciseName: string) {
    if (!selectedPlan) return
    Alert.alert('Remover exercício', `Remover “${exerciseName}” desta ficha?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => void onRemoveExercise(selectedPlan.id, exerciseId),
      },
    ])
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Biblioteca de rotinas"
          title={'Fichas de\ntreino'}
          description="Monte sequências reutilizáveis e deixe cada sessão pronta."
        />

        {!plans.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>▤</Text></View>
            <Text style={styles.emptyTitle}>Sua primeira ficha começa aqui</Text>
            <Text style={styles.emptyText}>
              Crie uma rotina, como “Treino de calistenia”, e organize os exercícios.
            </Text>
            <View style={styles.emptyAction}>
              <PrimaryButton label="＋  Criar ficha" onPress={() => setShowForm(true)} />
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              contentContainerStyle={styles.planSelector}
              showsHorizontalScrollIndicator={false}
              style={styles.planSelectorScroll}
            >
              {plans.map((plan) => {
                const active = selectedPlan?.id === plan.id
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => onSelect(plan.id)}
                    style={({ pressed }) => [
                      styles.planOption,
                      active && styles.planOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.planTop}>
                      <View style={[styles.planIcon, active && styles.planIconActive]}>
                        <Text style={[styles.planIconText, active && styles.activeText]}>{active ? '✓' : '▤'}</Text>
                      </View>
                      <Text style={[styles.planCount, active && styles.activeMuted]}>
                        {plan.exercises.length} exercícios
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.planName, active && styles.activeText]}>{plan.name}</Text>
                    <Text style={[styles.planMeta, active && styles.activeMuted]}>
                      {plan.category} · {plan.difficulty}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {!!selectedPlan && (
              <>
                <View style={styles.hero}>
                  <Text style={styles.heroCategory}>{selectedPlan.category.toUpperCase()}</Text>
                  <Text style={styles.heroTitle}>{selectedPlan.name}</Text>
                  <Text style={styles.heroDescription}>
                    {selectedPlan.description || 'Uma sequência pronta para repetir e evoluir.'}
                  </Text>
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{selectedPlan.exercises.length}</Text>
                      <Text style={styles.heroStatLabel}>exercícios</Text>
                    </View>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValueSmall}>{selectedPlan.difficulty}</Text>
                      <Text style={styles.heroStatLabel}>nível</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.heroButton} onPress={() => onAddExercise(selectedPlan.id)}>
                    <Text style={styles.heroButtonText}>＋  Adicionar exercício</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <View>
                      <Text style={styles.listEyebrow}>SEQUÊNCIA DA FICHA</Text>
                      <Text style={styles.listTitle}>Exercícios</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={() => onAddExercise(selectedPlan.id)}>
                      <Text style={styles.addButtonText}>＋</Text>
                    </TouchableOpacity>
                  </View>
                  {!selectedPlan.exercises.length ? (
                    <View style={styles.noExercises}>
                      <Text style={styles.noExercisesIcon}>⌁</Text>
                      <Text style={styles.noExercisesTitle}>Ficha ainda vazia</Text>
                      <Text style={styles.noExercisesText}>Adicione o primeiro movimento da sequência.</Text>
                    </View>
                  ) : (
                    selectedPlan.exercises.map((exercise, index) => (
                      <View key={exercise.id} style={[styles.exerciseRow, index > 0 && styles.exerciseBorder]}>
                        <View style={styles.exerciseIndex}>
                          <Text style={styles.exerciseIndexText}>{String(index + 1).padStart(2, '0')}</Text>
                        </View>
                        <View style={styles.exerciseCopy}>
                          <Text numberOfLines={1} style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>
                            {exercise.sets} séries · {exercise.reps} reps · {exercise.restSeconds}s
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.removeExercise} onPress={() => confirmExerciseRemoval(exercise.id, exercise.name)}>
                          <Text style={styles.removeExerciseText}>⌫</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                <TouchableOpacity style={styles.deletePlan} onPress={() => confirmPlanRemoval(selectedPlan)}>
                  <Text style={styles.deletePlanText}>Excluir esta ficha</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.82} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>NOVA ROTINA</Text>
                <Text style={styles.sheetTitle}>Criar ficha</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowForm(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <FormField label="Nome da ficha" value={name} onChangeText={setName} placeholder="Ex.: Treino de calistenia" />
            <FormField label="Objetivo" value={description} onChangeText={setDescription} placeholder="O que esta rotina desenvolve?" multiline />
            <FormField label="Categoria" value={category} onChangeText={setCategory} placeholder="Calistenia" />
            <Text style={styles.difficultyLabel}>NÍVEL</Text>
            <View style={styles.difficultyOptions}>
              {['Iniciante', 'Intermediário', 'Avançado'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.difficultyButton, difficulty === item && styles.difficultyButtonActive]}
                  onPress={() => setDifficulty(item)}
                >
                  <Text style={[styles.difficultyText, difficulty === item && styles.difficultyTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label="Salvar ficha" loading={loading} onPress={() => void submit()} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 130 },
  planSelectorScroll: { marginHorizontal: -shared.pagePadding, marginBottom: 18 },
  planSelector: { gap: 9, paddingHorizontal: shared.pagePadding },
  planOption: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 21, borderWidth: 1, minHeight: 130, padding: 14, width: 220 },
  planOptionActive: { backgroundColor: colors.nearBlack, borderColor: colors.nearBlack },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  planTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  planIcon: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  planIconActive: { backgroundColor: 'rgba(255,255,255,.1)' },
  planIconText: { color: colors.gray500, fontSize: 15 },
  planCount: { color: colors.gray500, fontSize: 8 },
  planName: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 14 },
  planMeta: { color: colors.gray500, fontSize: 9, marginTop: 5 },
  activeText: { color: '#fff' },
  activeMuted: { color: '#858585' },
  hero: { backgroundColor: colors.nearBlack, borderRadius: 26, marginBottom: 12, overflow: 'hidden', padding: 21 },
  heroCategory: { color: '#858585', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '700', letterSpacing: -0.8, marginTop: 18 },
  heroDescription: { color: '#a3a3a3', fontSize: 11, lineHeight: 17, marginTop: 9, minHeight: 35 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  heroStat: { backgroundColor: 'rgba(255,255,255,.07)', borderRadius: 15, flex: 1, padding: 12 },
  heroStatValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroStatValueSmall: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 },
  heroStatLabel: { color: '#858585', fontSize: 8, marginTop: 3 },
  heroButton: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', marginTop: 12, minHeight: 49 },
  heroButtonText: { color: '#111', fontSize: 11, fontWeight: '800' },
  listCard: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  listHeader: { alignItems: 'center', borderBottomColor: colors.gray100, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  listEyebrow: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  listTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 4 },
  addButton: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  addButtonText: { color: colors.ink, fontSize: 19 },
  noExercises: { alignItems: 'center', justifyContent: 'center', minHeight: 210, padding: 24 },
  noExercisesIcon: { color: colors.gray400, fontSize: 26 },
  noExercisesTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 10 },
  noExercisesText: { color: colors.gray500, fontSize: 10, marginTop: 5 },
  exerciseRow: { alignItems: 'center', flexDirection: 'row', gap: 11, padding: 14 },
  exerciseBorder: { borderTopColor: colors.gray100, borderTopWidth: 1 },
  exerciseIndex: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  exerciseIndexText: { color: colors.gray500, fontSize: 9, fontWeight: '800' },
  exerciseCopy: { flex: 1 },
  exerciseName: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  exerciseMeta: { color: colors.gray400, fontSize: 9, marginTop: 4 },
  removeExercise: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  removeExerciseText: { color: colors.gray400, fontSize: 17 },
  deletePlan: { alignItems: 'center', minHeight: 48, justifyContent: 'center', marginTop: 4 },
  deletePlanText: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 24, borderWidth: 1, justifyContent: 'center', minHeight: 370, padding: 28 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 20, height: 62, justifyContent: 'center', width: 62 },
  emptyIconText: { color: colors.gray500, fontSize: 22 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  emptyText: { color: colors.gray500, fontSize: 11, lineHeight: 17, marginTop: 8, textAlign: 'center' },
  emptyAction: { marginTop: 20, width: '100%' },
  fab: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 19, bottom: 94, height: 56, justifyContent: 'center', position: 'absolute', right: 20, width: 56 },
  fabText: { color: colors.onPrimary, fontSize: 23 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,.58)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '94%', padding: 20, paddingBottom: 28 },
  handle: { alignSelf: 'center', backgroundColor: colors.gray300, borderRadius: 99, height: 4, marginBottom: 20, width: 40 },
  sheetHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  sheetEyebrow: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.7, marginTop: 7 },
  closeButton: { alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  closeButtonText: { color: colors.gray500, fontSize: 22 },
  difficultyLabel: { color: colors.gray500, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  difficultyOptions: { backgroundColor: colors.gray100, borderRadius: 16, flexDirection: 'row', gap: 3, marginBottom: 18, padding: 4 },
  difficultyButton: { alignItems: 'center', borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 42 },
  difficultyButtonActive: { backgroundColor: colors.card },
  difficultyText: { color: colors.gray400, fontSize: 9, fontWeight: '700' },
  difficultyTextActive: { color: colors.ink },
  error: { backgroundColor: colors.gray100, borderRadius: 12, color: colors.danger, fontSize: 10, fontWeight: '700', marginBottom: 12, padding: 11 },
})

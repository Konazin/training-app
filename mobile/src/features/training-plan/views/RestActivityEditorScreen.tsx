import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ScreenHeader } from '../../../components/ScreenHeader'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { RestActivityInput, TrainingPlan } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'

const categories = [
  'caminhada',
  'mobilidade',
  'alongamento',
  'recuperação ativa',
  'descanso completo',
  'personalizada',
]

export function RestActivityEditorScreen({
  plans,
  busyKeys,
  errors,
  onCreate,
  onUpdate,
}: {
  plans: TrainingPlan[]
  busyKeys: Set<string>
  errors: Record<string, string>
  onCreate: (planId: number, dayId: number, input: RestActivityInput) => Promise<boolean>
  onUpdate: (
    planId: number,
    dayId: number,
    activityId: number,
    input: RestActivityInput,
  ) => Promise<boolean>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'RestActivityEditor'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params.planId)
  const day = plan?.days.find((item) => item.id === route.params.dayId)
  const activity = day?.restActivities.find((item) => item.id === route.params.activityId)
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [name, setName] = useState(activity?.name ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [category, setCategory] = useState(activity?.category ?? 'recuperação ativa')
  const [duration, setDuration] = useState(String(activity?.estimatedDurationMinutes ?? 15))
  const [optional, setOptional] = useState(activity?.optional ?? true)
  const [formError, setFormError] = useState('')
  const form: RestActivityInput = {
    name,
    description,
    category,
    estimatedDurationMinutes: Number(duration) || 0,
    optional,
  }
  const { commit } = useUnsavedChangesGuard(form)

  if (!plan || !day) {
    return <View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View>
  }

  const planId = plan.id
  const dayId = day.id
  const key = activity ? `activity:update:${activity.id}` : `day:activity:add:${day.id}`

  async function save() {
    if (!name.trim() || !category.trim()) {
      setFormError('Preencha nome e categoria.')
      return
    }
    const success = activity
      ? await onUpdate(planId, dayId, activity.id, form)
      : await onCreate(planId, dayId, form)
    if (success) commit(form, navigation.goBack)
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        eyebrow={activity ? 'Editar atividade' : 'Nova atividade'}
        title={activity?.name ?? 'Descanso ativo'}
        description="Atividade opcional para o dia de recuperação."
      />
      <View style={styles.form}>
        <FormField label="Nome" value={name} onChangeText={setName} />
        <FormField label="Descrição" value={description} onChangeText={setDescription} multiline />
        <FormField label="Categoria" value={category} onChangeText={setCategory} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, category === item && styles.chipActive]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FormField
          label="Duração estimada (min)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setOptional((current) => !current)}>
          <View style={[styles.checkbox, optional && styles.checkboxActive]}>
            <Text style={styles.checkboxText}>{optional ? '✓' : ''}</Text>
          </View>
          <Text style={styles.checkboxLabel}>Atividade opcional</Text>
        </TouchableOpacity>
        {!!(formError || errors[key]) && <Text style={styles.error}>{formError || errors[key]}</Text>}
        <PrimaryButton
          label="Salvar atividade"
          loading={busyKeys.has(key)}
          onPress={() => void save()}
        />
      </View>
    </ScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 45 },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 14 },
  chips: { marginBottom: 14 },
  chip: { backgroundColor: colors.gray100, borderRadius: 12, marginRight: 6, paddingHorizontal: 10, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.gray500, fontSize: 8, fontWeight: '700' },
  chipTextActive: { color: colors.onPrimary },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 14 },
  checkbox: { alignItems: 'center', borderColor: colors.gray300, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  checkboxLabel: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 9, marginBottom: 9 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})

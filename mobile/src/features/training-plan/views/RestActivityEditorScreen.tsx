import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { SelectableChip } from '../../../components/SelectableChip'
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
    return <Screen><View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View></Screen>
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
    <ScreenScrollView>
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
            <SelectableChip
              key={item}
              label={item}
              selected={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </ScrollView>
        <FormField
          label="Duração estimada (min)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: optional }} style={styles.checkboxRow} onPress={() => setOptional((current) => !current)}>
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
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 16 },
  chips: { marginBottom: 14 },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 14, minHeight: 48 },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  checkboxLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginBottom: 9 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
})

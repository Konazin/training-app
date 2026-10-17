import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { SelectableChip } from '../../../components/SelectableChip'
import { BottomActionBar } from '../../../components/ui/BottomActionBar'
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
    <>
    <ScreenScrollView contentContainerStyle={styles.content}>
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
            {optional && <Check color={colors.on} size={16} strokeWidth={2} />}
          </View>
          <Text style={styles.checkboxLabel}>Atividade opcional</Text>
        </TouchableOpacity>
        {!!(formError || errors[key]) && <Text style={styles.error}>{formError || errors[key]}</Text>}
      </View>
    </ScreenScrollView>
    <BottomActionBar>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: busyKeys.has(key), busy: busyKeys.has(key) }}
        disabled={busyKeys.has(key)}
        onPress={() => void save()}
        style={[styles.saveButton, busyKeys.has(key) && styles.disabled]}
      >
        <Text style={styles.saveButtonText}>{busyKeys.has(key) ? 'Salvando…' : 'Salvar atividade'}</Text>
      </TouchableOpacity>
    </BottomActionBar>
    </>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { paddingBottom: 132 },
  form: { gap: 4 },
  chips: { marginBottom: 14 },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 14, minHeight: 48 },
  checkbox: { alignItems: 'center', borderColor: colors.bd, borderRadius: 4, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxActive: { backgroundColor: colors.ac, borderColor: colors.ac },
  checkboxLabel: { color: colors.tx, fontFamily: 'Geist', fontSize: 14, fontWeight: '400' },
  error: { color: colors.dg, fontFamily: 'Geist', fontSize: 14, lineHeight: 20, marginBottom: 9, marginTop: 8 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: colors.tx, fontFamily: 'Geist', fontSize: 18, fontWeight: '500' },
  saveButton: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, justifyContent: 'center', minHeight: 56 },
  saveButtonText: { color: colors.on, fontFamily: 'Geist', fontSize: 16, fontWeight: '500' },
  disabled: { opacity: 0.55 },
})

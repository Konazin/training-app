import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { OptionPickerField, OptionPickerModal } from '../../../components/OptionPicker'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { Screen, ScreenScrollView } from '../../../components/Screen'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { RestActivityInput, TrainingPlan } from '../model/trainingPlan'
import { type ThemeColors, useTheme } from '../../../theme'

const categoryOptions = ['Caminhada', 'Mobilidade', 'Alongamento', 'Recuperação ativa', 'Descanso completo']

export function RestActivityEditorScreen({ plans, busyKeys, errors, onCreate, onUpdate }: { plans: TrainingPlan[]; busyKeys: Set<string>; errors: Record<string, string>; onCreate: (planId: number, dayId: number, input: RestActivityInput) => Promise<boolean>; onUpdate: (planId: number, dayId: number, activityId: number, input: RestActivityInput) => Promise<boolean> }) {
  const route = useRoute<RouteProp<RootStackParamList, 'RestActivityEditor'>>(); const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); const plan = plans.find((item) => item.id === route.params.planId); const day = plan?.days.find((item) => item.id === route.params.dayId); const activity = day?.restActivities.find((item) => item.id === route.params.activityId); const { colors } = useTheme(); const styles = createStyles(colors)
  const [name, setName] = useState(activity?.name ?? ''); const [description, setDescription] = useState(activity?.description ?? ''); const [category, setCategory] = useState(activity?.category ?? 'Recuperação ativa'); const [duration, setDuration] = useState(String(activity?.estimatedDurationMinutes ?? 15)); const [optional, setOptional] = useState(activity?.optional ?? true); const [categoryOpen, setCategoryOpen] = useState(false); const [formError, setFormError] = useState('')
  const form: RestActivityInput = { name, description, category, estimatedDurationMinutes: Number(duration) || 0, optional }; const { commit } = useUnsavedChangesGuard(form)
  if (!plan || !day) return <Screen><View style={styles.empty}><Text style={styles.title}>Dia não encontrado</Text></View></Screen>
  const planId = plan.id; const dayId = day.id; const key = activity ? `activity:update:${activity.id}` : `day:activity:add:${dayId}`; const customCategory = !categoryOptions.includes(category)
  async function save() { if (!name.trim() || !category.trim()) { setFormError(!name.trim() ? 'Informe o nome da atividade.' : 'Informe a categoria da atividade.'); return } setFormError(''); const success = activity ? await onUpdate(planId, dayId, activity.id, form) : await onCreate(planId, dayId, form); if (success) commit(form, navigation.goBack) }
  return <ScreenScrollView>
    <ScreenHeader eyebrow={activity ? 'Editar atividade' : 'Nova atividade'} title={activity?.name ?? 'Atividade de recuperação'} description="Planeje uma recuperação simples para este dia." variant="standard" />
    <FormSection title="ATIVIDADE"><FormField label="Nome" value={name} onChangeText={setName} /></FormSection>
    <FormSection title="TIPO"><OptionPickerField label="Categoria" value={category} placeholder="Selecionar categoria" onPress={() => setCategoryOpen(true)} />{customCategory && <FormField label="Categoria personalizada" value={category} onChangeText={setCategory} maxLength={50} />}</FormSection>
    <FormSection title="DURAÇÃO"><FormField label="Duração estimada (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" /></FormSection>
    <FormSection title="OPÇÕES"><TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Atividade opcional" accessibilityState={{ checked: optional }} style={styles.checkboxRow} onPress={() => setOptional((current) => !current)}><View style={[styles.checkbox, optional && styles.checkboxActive]}><Text style={styles.checkboxText}>{optional ? '✓' : ''}</Text></View><View style={styles.checkboxCopy}><Text style={styles.checkboxLabel}>Atividade opcional</Text><Text style={styles.checkboxDescription}>Pode ser feita quando houver disponibilidade.</Text></View></TouchableOpacity><FormField label="Descrição / notas" value={description} onChangeText={setDescription} multiline /></FormSection>
    {!!(formError || errors[key]) && <Text accessibilityLiveRegion="polite" style={styles.error}>{formError || errors[key]}</Text>}
    <PrimaryButton label="Salvar atividade" loading={busyKeys.has(key)} onPress={() => void save()} />
    <OptionPickerModal visible={categoryOpen} title="Categoria" options={categoryOptions} value={category} customLabel="Categoria personalizada" onCancel={() => setCategoryOpen(false)} onConfirm={(value) => { setCategory(value); setCategoryOpen(false) }} />
  </ScreenScrollView>
}
function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <View><SectionHeader title={title} />{children}</View> }
const createStyles = (colors: ThemeColors) => StyleSheet.create({ checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56 }, checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 }, checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary }, checkboxText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' }, checkboxCopy: { flex: 1 }, checkboxLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' }, checkboxDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 }, error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginBottom: 12 }, empty: { alignItems: 'center', flex: 1, justifyContent: 'center' }, title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' } })

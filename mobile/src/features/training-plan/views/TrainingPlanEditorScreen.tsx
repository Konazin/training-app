import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FormField } from '../../../components/FormField'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { ScreenScrollView } from '../../../components/Screen'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { TrainingPlan, TrainingPlanInput } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'

export function TrainingPlanEditorScreen({
  plans,
  busyKeys,
  errors,
  onCreate,
  onUpdate,
  onActivate,
  onDuplicate,
  onArchive,
  onMoveToTrash,
}: {
  plans: TrainingPlan[]
  busyKeys: Set<string>
  errors: Record<string, string>
  onCreate: (input: TrainingPlanInput) => Promise<boolean>
  onUpdate: (id: number, input: TrainingPlanInput) => Promise<boolean>
  onActivate: (id: number) => Promise<boolean>
  onDuplicate: (id: number) => Promise<boolean>
  onArchive: (id: number, archived?: boolean) => Promise<boolean>
  onMoveToTrash: (id: number) => Promise<boolean>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'TrainingPlanEditor'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params?.planId)
  const key = plan ? `plan:update:${plan.id}` : 'plan:create'
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [category, setCategory] = useState(plan?.category ?? '')
  const [difficulty, setDifficulty] = useState(plan?.difficulty ?? '')
  const [formError, setFormError] = useState('')
  const form: TrainingPlanInput = {
    name,
    description,
    category,
    difficulty,
    startDate: plan?.startDate,
    endDate: plan?.endDate,
  }
  const { dirty, commit } = useUnsavedChangesGuard(form)

  async function save() {
    if (!name.trim() || !category.trim() || !difficulty.trim()) {
      setFormError('Preencha nome, categoria e dificuldade.')
      return
    }
    setFormError('')
    const success = plan ? await onUpdate(plan.id, form) : await onCreate(form)
    if (success) commit(form, navigation.goBack)
  }

  return (
    <ScreenScrollView>
      <ScreenHeader
        eyebrow={plan ? 'Editar ficha' : 'Nova ficha'}
        title={plan ? plan.name : 'Montar ficha'}
        description="Dados gerais da programação semanal."
      />
      <FormField label="Nome" value={name} onChangeText={setName} />
      <FormField label="Descrição" value={description} onChangeText={setDescription} multiline />
      <FormField label="Categoria" value={category} onChangeText={setCategory} placeholder="Ex.: Força" />
      <FormField label="Dificuldade" value={difficulty} onChangeText={setDifficulty} placeholder="Ex.: Intermediário" />
      {!!(formError || errors[key]) && <Text style={styles.error}>{formError || errors[key]}</Text>}
      <PrimaryButton label="Salvar ficha" loading={busyKeys.has(key)} onPress={() => void save()} />

      {!!plan && (
        <>
          {!plan.active && (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: dirty || busyKeys.has(`plan:activate:${plan.id}`) }}
                style={styles.secondary}
                disabled={dirty || busyKeys.has(`plan:activate:${plan.id}`)}
                onPress={() => void onActivate(plan.id)}
              >
                <Text style={styles.secondaryText}>Ativar ficha</Text>
              </TouchableOpacity>
              {!!errors[`plan:activate:${plan.id}`] && (
                <Text style={styles.error}>{errors[`plan:activate:${plan.id}`]}</Text>
              )}
            </>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: dirty || busyKeys.has(`plan:duplicate:${plan.id}`) }}
            style={styles.secondary}
            disabled={dirty || busyKeys.has(`plan:duplicate:${plan.id}`)}
            onPress={() => void (async () => {
              if (await onDuplicate(plan.id)) commit(form, navigation.goBack)
            })()}
          >
            <Text style={styles.secondaryText}>Duplicar ficha</Text>
          </TouchableOpacity>
          {!!errors[`plan:duplicate:${plan.id}`] && (
            <Text style={styles.error}>{errors[`plan:duplicate:${plan.id}`]}</Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: dirty || busyKeys.has(`plan:archive:${plan.id}`) }}
            disabled={dirty || busyKeys.has(`plan:archive:${plan.id}`)}
            onPress={() => Alert.alert(
              'Arquivar ficha?',
              'Ela sairá da seleção, mas continuará salva.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Arquivar',
                  style: 'destructive',
                  onPress: () => void (async () => {
                    if (await onArchive(plan.id)) commit(form, navigation.goBack)
                  })(),
                },
              ],
            )}
          >
            <Text style={styles.archive}>Arquivar ficha</Text>
          </TouchableOpacity>
          {!!errors[`plan:archive:${plan.id}`] && (
            <Text style={styles.error}>{errors[`plan:archive:${plan.id}`]}</Text>
          )}
          <Text style={styles.dangerTitle}>ZONA DE PERIGO</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: dirty }}
            disabled={dirty}
            onPress={() => Alert.alert(
              'Mover ficha para a lixeira?',
              'Você poderá restaurá-la durante os próximos 7 dias.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Mover',
                  style: 'destructive',
                  onPress: () => void (async () => {
                    if (await onMoveToTrash(plan.id)) commit(form, navigation.goBack)
                  })(),
                },
              ],
            )}
          >
            <Text style={styles.archive}>Mover para a lixeira</Text>
          </TouchableOpacity>
          {dirty && <Text style={styles.hint}>Salve ou descarte as alterações para usar estas ações.</Text>}
        </>
      )}
    </ScreenScrollView>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  secondary: { alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 9, minHeight: 48 },
  secondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  archive: { color: colors.danger, fontSize: 14, fontWeight: '700', minHeight: 48, padding: 16, textAlign: 'center' },
  dangerTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 20 },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})

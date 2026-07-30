import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  TRAINING_PLAN_CATEGORY_PRESETS,
  TRAINING_PLAN_DIFFICULTY_PRESETS,
  TRAINING_PLAN_TEMPLATES,
  type TrainingPlanCreationInput,
  type TrainingPlanDayCreationInput,
  type TrainingPlanDuplicateMode,
  type TrainingPlanTemplate,
  type TrainingPlanTemplateId,
} from '@training/training-domain'
import { FormField } from '../../../components/FormField'
import { OptionPickerField, OptionPickerModal } from '../../../components/OptionPicker'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ScreenHeader } from '../../../components/ScreenHeader'
import { ScreenScrollView } from '../../../components/Screen'
import type { RootStackParamList } from '../../../navigation/types'
import { useUnsavedChangesGuard } from '../../../navigation/useUnsavedChangesGuard'
import type { TrainingPlan, TrainingPlanInput } from '../model/trainingPlan'
import { shared, type ThemeColors, useTheme } from '../../../theme'
import type { TrashUiResult } from '../controller/useTrainingPlanTrashController'
import type {
  TrainingPlanUiResult,
} from '../controller/useTrainingPlanController'
import {
  applyTemplateToEditor,
  validateTrainingPlanEditorValues,
  type TrainingPlanEditorErrors,
} from '../model/trainingPlanEditor'
import { TrainingPlanDuplicateModal } from './TrainingPlanDuplicateModal'
import { TrainingPlanTemplateModal } from './TrainingPlanTemplateModal'
import { TrainingPlanWeekPreview } from './TrainingPlanWeekPreview'

type EditorDay = TrainingPlanDayCreationInput & {
  exercises?: readonly unknown[]
  restActivities?: readonly unknown[]
}

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
  onCreate: (input: TrainingPlanCreationInput) => Promise<TrainingPlanUiResult>
  onUpdate: (id: number, input: TrainingPlanInput) => Promise<boolean>
  onActivate: (id: number) => Promise<boolean>
  onDuplicate: (
    id: number,
    mode: TrainingPlanDuplicateMode,
  ) => Promise<TrainingPlanUiResult>
  onArchive: (id: number, archived?: boolean) => Promise<boolean>
  onMoveToTrash: (id: number) => Promise<TrashUiResult>
}) {
  const route = useRoute<RouteProp<RootStackParamList, 'TrainingPlanEditor'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const plan = plans.find((item) => item.id === route.params?.planId)
  const key = plan ? `plan:update:${plan.id}` : 'plan:create'
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const initial = useMemo(() => initialEditor(plan), [plan])
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [category, setCategory] = useState(initial.category)
  const [difficulty, setDifficulty] = useState(initial.difficulty)
  const [days, setDays] = useState<EditorDay[]>(initial.days)
  const [templateId, setTemplateId] = useState<TrainingPlanTemplateId | null>(null)
  const [picker, setPicker] = useState<'category' | 'difficulty' | null>(null)
  const [templateOpen, setTemplateOpen] = useState(!plan)
  const [templatePreviewId, setTemplatePreviewId] = useState<TrainingPlanTemplateId | null>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [duplicateMode, setDuplicateMode] = useState<TrainingPlanDuplicateMode>('COMPLETE')
  const [fieldErrors, setFieldErrors] = useState<TrainingPlanEditorErrors>({})
  const guardValue = plan ? {
    name,
    description,
    category,
    difficulty,
  } : {
    name,
    description,
    category,
    difficulty,
    categoryCustom: !TRAINING_PLAN_CATEGORY_PRESETS.includes(category as never) ? category : '',
    difficultyCustom: !TRAINING_PLAN_DIFFICULTY_PRESETS.includes(difficulty as never) ? difficulty : '',
    templateId,
    days,
  }
  const { dirty, commit } = useUnsavedChangesGuard(guardValue)
  const duplicateBusy = Boolean(plan && busyKeys.has(`plan:duplicate:${plan.id}`))

  const updateValue = (
    field: 'name' | 'description' | 'category' | 'difficulty',
    value: string,
  ) => {
    if (field === 'name') setName(value)
    if (field === 'description') setDescription(value)
    if (field === 'category') setCategory(value)
    if (field === 'difficulty') setDifficulty(value)
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function save() {
    const validation = validateTrainingPlanEditorValues({ name, description, category, difficulty })
    setFieldErrors(validation.errors)
    if (!validation.values) return
    const form: TrainingPlanInput = {
      ...validation.values,
      startDate: plan?.startDate,
      endDate: plan?.endDate,
    }
    if (plan) {
      if (await onUpdate(plan.id, form)) commit({ ...guardValue, ...form }, navigation.goBack)
      return
    }
    const input: TrainingPlanCreationInput = {
      plan: form,
      days: days.map(({ weekday, title, description: dayDescription, restDay, estimatedDurationMinutes, notes }) => ({
        weekday,
        title,
        description: dayDescription,
        restDay,
        estimatedDurationMinutes,
        notes,
      })),
      templateId: templateId ?? undefined,
    }
    const result = await onCreate(input)
    if (result.status === 'success') commit({ ...guardValue, ...form }, navigation.goBack)
  }

  const applyTemplate = (template: TrainingPlanTemplate) => {
    if (plan) return
    const apply = () => {
      const values = applyTemplateToEditor({ name, description, category, difficulty }, template)
      setName(values.name)
      setDescription(values.description)
      setCategory(values.category)
      setDifficulty(values.difficulty)
      setDays(template.days.map((day) => ({ ...day })))
      setTemplateId(template.id)
      setTemplateOpen(false)
      setTemplatePreviewId(null)
      setFieldErrors({})
    }
    if (!dirty) {
      apply()
      return
    }
    Alert.alert(
      'Substituir estrutura semanal?',
      'O template substituirá a categoria, a dificuldade e a estrutura semanal atuais.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Substituir', style: 'destructive', onPress: apply },
      ],
    )
  }

  return (
    <>
      <ScreenScrollView>
        <ScreenHeader
          eyebrow={plan ? 'Editar ficha' : 'Nova ficha'}
          title={plan ? plan.name : 'Montar ficha'}
          description="Dados gerais e estrutura da programação semanal."
        />

        <Section title="DADOS DA FICHA" styles={styles}>
          <FormField
            error={fieldErrors.name}
            label="Nome"
            maxLength={80}
            onChangeText={(value) => updateValue('name', value)}
            value={name}
          />
          <FormField
            error={fieldErrors.description}
            label="Descrição"
            maxLength={500}
            multiline
            onChangeText={(value) => updateValue('description', value)}
            value={description}
          />
          <OptionPickerField
            error={fieldErrors.category}
            label="Categoria"
            onPress={() => setPicker('category')}
            placeholder="Selecione uma categoria"
            value={category}
          />
          <OptionPickerField
            error={fieldErrors.difficulty}
            label="Dificuldade"
            onPress={() => setPicker('difficulty')}
            placeholder="Selecione uma dificuldade"
            value={difficulty}
          />
        </Section>

        <Section title="ESTRUTURA SEMANAL" styles={styles}>
          {!plan && !!templateId && (
            <Text style={styles.templateName}>
              Template: {TRAINING_PLAN_TEMPLATES.find((item) => item.id === templateId)?.name}
            </Text>
          )}
          <TrainingPlanWeekPreview days={days} />
          {plan ? (
            <Text style={styles.hint}>
              Edite os dias, exercícios e atividades pelas telas da ficha.
            </Text>
          ) : (
            <>
              <PrimaryButton
                label={templateId ? 'Trocar template' : 'Escolher template'}
                onPress={() => setTemplateOpen(true)}
                secondary
              />
              <Text style={styles.hint}>
                Depois de salvar, use as telas de cada dia para editar exercícios e atividades.
              </Text>
            </>
          )}
        </Section>

        {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
        <PrimaryButton label="Salvar ficha" loading={busyKeys.has(key)} onPress={() => void save()} />

        {!!plan && (
          <>
            <Section title="GESTÃO" styles={styles}>
              {!plan.active && (
                <PrimaryButton
                  disabled={dirty}
                  label="Ativar ficha"
                  loading={busyKeys.has(`plan:activate:${plan.id}`)}
                  onPress={() => void onActivate(plan.id)}
                  secondary
                />
              )}
              <PrimaryButton
                disabled={dirty}
                label="Duplicar ficha"
                onPress={() => setDuplicateOpen(true)}
                secondary
              />
              <PrimaryButton
                disabled={dirty}
                label="Arquivar ficha"
                onPress={() => Alert.alert(
                  'Arquivar ficha?',
                  'Ela sairá da seleção, mas continuará salva.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Arquivar',
                      style: 'destructive',
                      onPress: () => void (async () => {
                        if (await onArchive(plan.id)) commit(guardValue, navigation.goBack)
                      })(),
                    },
                  ],
                )}
                secondary
              />
              {dirty && <Text style={styles.hint}>Salve ou descarte as alterações para usar estas ações.</Text>}
            </Section>
            <Section title="ZONA DE PERIGO" styles={styles} danger>
              <Pressable
                accessibilityLabel="Mover ficha para a lixeira"
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
                        const result = await onMoveToTrash(plan.id)
                        if (result.status === 'success') commit(guardValue, navigation.goBack)
                      })(),
                    },
                  ],
                )}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerText}>Mover para a lixeira</Text>
              </Pressable>
            </Section>
          </>
        )}
      </ScreenScrollView>

      <OptionPickerModal
        customLabel="Categoria personalizada"
        onCancel={() => setPicker(null)}
        onConfirm={(value) => {
          updateValue('category', value)
          setPicker(null)
        }}
        options={TRAINING_PLAN_CATEGORY_PRESETS}
        title="Selecionar categoria"
        value={category}
        visible={picker === 'category'}
      />
      <OptionPickerModal
        customLabel="Dificuldade personalizada"
        onCancel={() => setPicker(null)}
        onConfirm={(value) => {
          updateValue('difficulty', value)
          setPicker(null)
        }}
        options={TRAINING_PLAN_DIFFICULTY_PRESETS}
        title="Selecionar dificuldade"
        value={difficulty}
        visible={picker === 'difficulty'}
      />
      {!plan && (
        <TrainingPlanTemplateModal
          onBack={() => setTemplatePreviewId(null)}
          onCancel={() => {
            setTemplateOpen(false)
            setTemplatePreviewId(null)
          }}
          onPreview={setTemplatePreviewId}
          onUse={applyTemplate}
          previewId={templatePreviewId}
          visible={templateOpen}
        />
      )}
      {!!plan && (
        <TrainingPlanDuplicateModal
          busy={duplicateBusy}
          onCancel={() => {
            if (!duplicateBusy) setDuplicateOpen(false)
          }}
          onChange={setDuplicateMode}
          onConfirm={() => onDuplicate(plan.id, duplicateMode)}
          onSuccess={() => {
            setDuplicateOpen(false)
            commit(guardValue, navigation.goBack)
          }}
          value={duplicateMode}
          visible={duplicateOpen}
        />
      )}
    </>
  )
}

function Section({
  title,
  styles,
  danger = false,
  children,
}: {
  title: string
  styles: ReturnType<typeof createStyles>
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <View style={[styles.section, danger && styles.dangerSection]}>
      <Text style={[styles.sectionTitle, danger && styles.dangerText]}>{title}</Text>
      {children}
    </View>
  )
}

function initialEditor(plan?: TrainingPlan) {
  if (plan) {
    return {
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      days: plan.days.map((day): EditorDay => ({
        weekday: day.weekday,
        title: day.title,
        description: day.description,
        restDay: day.restDay,
        estimatedDurationMinutes: day.estimatedDurationMinutes,
        notes: day.notes,
        exercises: day.exercises,
        restActivities: day.restActivities,
      })),
    }
  }
  const blank = TRAINING_PLAN_TEMPLATES.find((template) => template.id === 'BLANK')!
  return {
    name: '',
    description: '',
    category: '',
    difficulty: '',
    days: blank.days.map((day) => ({ ...day })),
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 14, padding: 16 },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  templateName: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center' },
  dangerSection: { borderColor: colors.danger, marginTop: 14 },
  dangerButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: shared.touchTarget.minimum },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
})

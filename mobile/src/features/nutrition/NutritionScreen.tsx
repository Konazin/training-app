import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { File, Paths } from 'expo-file-system'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import {
  localDateKey,
  type DailyNutritionSummary,
  type NutritionAiDietSuggestion,
  type NutritionGoals,
  type NutritionMeal,
  type NutritionMealInput,
  type NutritionMealItem,
  type NutritionMealItemInput,
  type NutritionMealType,
  type SecretsRepository,
} from '@training/training-domain'
import type { LocalRepositories } from '@training/training-local-db'
import { EmptyState, InlineNotice, MetricCard, SectionHeader, StatusPill } from '../../components/ui'
import { ScreenScrollView } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { useTheme, type ThemeColors } from '../../theme'
import { typography } from '../../theme/typography'
import { createGeminiNutritionProvider } from './geminiNutritionProvider'
import { GEMINI_API_KEY_SECRET } from '../../integrations/secureSecrets'
import { consumedAtForDate, formatNumberInput, parseNumberInput } from './nutritionInput'

const EMPTY_GOALS: NutritionGoals = {
  caloriesKcal: null,
  proteinGrams: null,
  carbohydratesGrams: null,
  fatGrams: null,
  fiberGrams: null,
}
const NUTRITION_GOALS_KEY = 'nutrition.goals'
const SAVED_MENUS_KEY = 'nutrition.ai.saved-menus'
const MEAL_TYPES: NutritionMealType[] = [
  'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER',
]

interface SavedMenu {
  id: string
  createdAt: string
  suggestion: NutritionAiDietSuggestion
}

const emptyItem = (): NutritionMealItemInput => ({
  name: '',
  portionDescription: '',
  estimatedGrams: null,
  caloriesKcal: 0,
  proteinGrams: 0,
  carbohydratesGrams: 0,
  fatGrams: 0,
  fiberGrams: 0,
  micronutrients: {},
  confidence: null,
  dataSource: 'MANUAL',
  sortOrder: 0,
})

export function NutritionScreen({
  repositories,
  secrets,
}: {
  repositories: LocalRepositories
  secrets: SecretsRepository
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [date, setDate] = useState(() => localDateKey(new Date()))
  const [meals, setMeals] = useState<NutritionMeal[]>([])
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null)
  const [recentSummaries, setRecentSummaries] = useState<DailyNutritionSummary[]>([])
  const [goals, setGoals] = useState(EMPTY_GOALS)
  const [editing, setEditing] = useState<NutritionMeal | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<'warning' | 'danger' | 'success'>('warning')
  const [loading, setLoading] = useState(false)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [keyEntry, setKeyEntry] = useState('')
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [preferences, setPreferences] = useState('')
  const [dietSuggestion, setDietSuggestion] = useState<NutritionAiDietSuggestion | null>(null)
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const today = localDateKey(new Date())

  const refresh = useCallback(async () => {
    const operation = ++requestId.current
    setLoading(true)
    try {
      const [nextMeals, nextSummary, storedGoals, recent, storedMenus] = await Promise.all([
        repositories.nutritionMeals.listByDate(date),
        repositories.nutritionSummaries.findByDate(date),
        repositories.settings.get<unknown>(NUTRITION_GOALS_KEY),
        repositories.nutritionSummaries.listBetweenDates(addDays(date, -6), date),
        repositories.settings.get<unknown>(SAVED_MENUS_KEY),
      ])
      if (!mounted.current || operation !== requestId.current) return
      setMeals(nextMeals)
      setSummary(nextSummary)
      setGoals(readGoals(storedGoals))
      setRecentSummaries(recent)
      setSavedMenus(readSavedMenus(storedMenus))
    } catch {
      if (mounted.current && operation === requestId.current) {
        setNotice('Não foi possível atualizar os dados de nutrição deste aparelho.')
        setNoticeTone('danger')
      }
    } finally {
      if (mounted.current && operation === requestId.current) setLoading(false)
    }
  }, [date, repositories])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      activeRequest.current?.abort()
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void secrets.get(GEMINI_API_KEY_SECRET).then((key) => {
      if (mounted.current) {
        setApiKeyConfigured(Boolean(key))
        setShowAiSettings(!key)
      }
    }).catch(() => {
      if (mounted.current) {
        setShowAiSettings(true)
        setNotice('O armazenamento seguro não está disponível neste aparelho.')
        setNoticeTone('danger')
      }
    })
  }, [secrets])

  const saveMeal = async (input: NutritionMealInput) => {
    try {
      if (editing?.id) await repositories.nutritionMeals.update(editing.id, input)
      else await repositories.nutritionMeals.create(input)
      await repositories.nutritionMaintenance.aggregateDay(input.localDate)
      setEditing(null)
      setNotice('Refeição salva neste aparelho.')
      setNoticeTone('success')
      await refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível salvar a refeição.')
      setNoticeTone('danger')
      throw error
    }
  }

  const removeMeal = (meal: NutritionMeal) => Alert.alert(
    'Excluir refeição?',
    meal.title || mealTypeLabel(meal.mealType),
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await repositories.nutritionMeals.delete(meal.id)
              await repositories.nutritionMaintenance.aggregateDay(meal.localDate)
              await refresh()
            } catch {
              setNotice('Não foi possível excluir a refeição.')
              setNoticeTone('danger')
            }
          })()
        },
      },
    ],
  )

  const setGoal = async (next: NutritionGoals) => {
    try {
      await repositories.settings.set(NUTRITION_GOALS_KEY, normalizeGoals(next))
      setGoals(normalizeGoals(next))
      await repositories.nutritionMaintenance.aggregateDay(date)
      setNotice('Metas salvas neste aparelho.')
      setNoticeTone('success')
      await refresh()
    } catch {
      setNotice('Não foi possível salvar as metas.')
      setNoticeTone('danger')
    }
  }

  const saveApiKey = async () => {
    setSavingKey(true)
    try {
      await secrets.set(GEMINI_API_KEY_SECRET, keyEntry)
      setKeyEntry('')
      setApiKeyConfigured(true)
      setEditingKey(false)
      setNotice('Chave salva no armazenamento seguro deste aparelho.')
      setNoticeTone('success')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível salvar a chave.')
      setNoticeTone('danger')
    } finally {
      setSavingKey(false)
    }
  }

  const removeApiKey = () => Alert.alert(
    'Remover chave Gemini?',
    'A chave será apagada do armazenamento seguro deste aparelho. Nenhuma outra informação será alterada.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover chave',
        style: 'destructive',
        onPress: () => {
          void secrets.remove(GEMINI_API_KEY_SECRET).then(() => {
            setApiKeyConfigured(false)
            setEditingKey(false)
            setShowAiSettings(true)
            setNotice('Chave removida.')
            setNoticeTone('success')
          }).catch(() => {
            setNotice('Não foi possível remover a chave do armazenamento seguro.')
            setNoticeTone('danger')
          })
        },
      },
    ],
  )

  const runPhotoEstimate = async (source: 'CAMERA' | 'GALLERY') => {
    let temporaryImageUri: string | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    try {
      const key = await secrets.get(GEMINI_API_KEY_SECRET)
      if (!key) {
        setNotice('Configure sua chave Gemini antes de analisar uma imagem.')
        setNoticeTone('warning')
        setShowAiSettings(true)
        return
      }
      setAiBusy(true)
      if (source === 'CAMERA') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          setNotice('Permissão de câmera negada. Você ainda pode escolher uma imagem da galeria ou registrar manualmente.')
          setNoticeTone('warning')
          return
        }
      }
      const picker = source === 'CAMERA'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true })
      if (picker.canceled) return
      const asset = picker.assets[0]
      if (!asset) throw new Error('Nenhuma imagem foi selecionada.')
      temporaryImageUri = asset.uri
      if (asset.fileSize && asset.fileSize > 9 * 1024 * 1024) {
        throw new Error('A imagem excede 9 MB. Escolha uma imagem menor.')
      }
      if (!asset.base64) throw new Error('Não foi possível ler a imagem. Tente outra imagem ou use o registro manual.')
      const mimeType = normalizeImageMime(asset.mimeType, asset.fileName ?? undefined, asset.uri)
      if (!mimeType) throw new Error('Formato de imagem incompatível. Use JPEG, PNG ou WebP.')
      if (!await confirmAiSend('photo')) return

      const controller = new AbortController()
      activeRequest.current = controller
      timeout = setTimeout(() => controller.abort(), 90_000)
      const estimate = await createGeminiNutritionProvider(key).estimateMeal({
        base64: asset.base64,
        mimeType,
      }, controller.signal)
      if (!mounted.current) return
      setEditing({
        id: 0,
        localDate: date,
        consumedAt: consumedAtForDate(date),
        mealType: 'OTHER',
        title: estimate.title,
        notes: 'Estimativa gerada por IA. Revise os alimentos, porções e valores antes de salvar.',
        source,
        createdAt: '',
        updatedAt: '',
        items: estimate.items.map((item, index) => withMealItemIds(item, index)),
      })
      setNotice('')
    } catch (error) {
      if (mounted.current) {
        setNotice(error instanceof Error ? error.message : 'Não foi possível analisar a imagem.')
        setNoticeTone('danger')
      }
    } finally {
      if (timeout) clearTimeout(timeout)
      activeRequest.current = null
      if (mounted.current) setAiBusy(false)
      if (temporaryImageUri) deleteTemporaryImage(temporaryImageUri)
    }
  }

  const generateDietSuggestion = async () => {
    if (preferences.trim().length > 500) {
      setNotice('As preferências devem ter no máximo 500 caracteres.')
      setNoticeTone('warning')
      return
    }
    let timeout: ReturnType<typeof setTimeout> | null = null
    try {
      const key = await secrets.get(GEMINI_API_KEY_SECRET)
      if (!key) {
        setNotice('Configure sua chave Gemini antes de gerar uma sugestão.')
        setNoticeTone('warning')
        setShowAiSettings(true)
        return
      }
      setAiBusy(true)
      if (!await confirmAiSend('menu')) return
      const controller = new AbortController()
      activeRequest.current = controller
      timeout = setTimeout(() => controller.abort(), 90_000)
      const suggestion = await createGeminiNutritionProvider(key).suggestDailyMenu({ goals, preferences }, controller.signal)
      if (!mounted.current) return
      setEditingMenuId(null)
      setDietSuggestion(suggestion)
      setNotice('Sugestão recebida. Revise e edite antes de salvar neste aparelho.')
      setNoticeTone('warning')
    } catch (error) {
      if (mounted.current) {
        setNotice(error instanceof Error ? error.message : 'Não foi possível gerar a sugestão.')
        setNoticeTone('danger')
      }
    } finally {
      if (timeout) clearTimeout(timeout)
      activeRequest.current = null
      if (mounted.current) setAiBusy(false)
    }
  }

  const cancelAi = () => activeRequest.current?.abort()

  const saveDietSuggestion = async () => {
    if (!dietSuggestion) return
    try {
      const current = readSavedMenus(await repositories.settings.get<unknown>(SAVED_MENUS_KEY))
      const editingMenu = editingMenuId ? current.find((menu) => menu.id === editingMenuId) : null
      const saved: SavedMenu = editingMenu
        ? { ...editingMenu, suggestion: dietSuggestion }
        : {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          suggestion: dietSuggestion,
        }
      const next = editingMenu
        ? current.map((menu) => menu.id === editingMenu.id ? saved : menu)
        : [saved, ...current].slice(0, 20)
      await repositories.settings.set(SAVED_MENUS_KEY, next)
      setSavedMenus(next)
      setDietSuggestion(null)
      setEditingMenuId(null)
      setNotice(editingMenu ? 'Sugestão atualizada neste aparelho.' : 'Sugestão salva localmente. Ela não foi adicionada automaticamente às refeições.')
      setNoticeTone('success')
    } catch {
      setNotice('Não foi possível salvar a sugestão neste aparelho.')
      setNoticeTone('danger')
    }
  }

  const deleteSavedMenu = (id: string) => {
    const next = savedMenus.filter((menu) => menu.id !== id)
    void repositories.settings.set(SAVED_MENUS_KEY, next).then(() => {
      setSavedMenus(next)
      if (editingMenuId === id) {
        setEditingMenuId(null)
        setDietSuggestion(null)
      }
    }).catch(() => {
      setNotice('Não foi possível excluir a sugestão salva.')
      setNoticeTone('danger')
    })
  }

  const selectDate = (next: string) => {
    if (next > today) return
    setNotice('')
    setDate(next)
  }
  const changeDate = (delta: number) => selectDate(addDays(date, delta))
  const totals = summary ? {
    caloriesKcal: summary.totalCaloriesKcal,
    proteinGrams: summary.totalProteinGrams,
    carbohydratesGrams: summary.totalCarbohydratesGrams,
    fatGrams: summary.totalFatGrams,
    fiberGrams: summary.totalFiberGrams,
  } : sumItems(meals)
  const dailyGoals = summary ? {
    caloriesKcal: summary.goalCaloriesKcal,
    proteinGrams: summary.goalProteinGrams,
    carbohydratesGrams: summary.goalCarbohydratesGrams,
    fatGrams: summary.goalFatGrams,
    fiberGrams: summary.goalFiberGrams,
  } : goals

  if (editing) {
    return <MealForm
      initial={editing}
      onCancel={() => setEditing(null)}
      onSave={saveMeal}
    />
  }

  return (
    <ScreenScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.ac} />}
    >
      <ScreenHeader eyebrow="Acompanhamento local" title="Nutrição" description={readableDate(date)} />

      <View style={styles.dateRow}>
        <DateStep label="Dia anterior" onPress={() => changeDate(-1)} previous />
        <Text accessibilityRole="header" style={styles.selectedDate}>{date === today ? 'Hoje' : readableDate(date)}</Text>
        <DateStep label="Próximo dia" onPress={() => changeDate(1)} disabled={date >= today} />
      </View>
      {date !== today && <Action label="Hoje" onPress={() => selectDate(today)} />}

      {!!notice && <InlineNotice tone={noticeTone === 'success' ? 'success' : noticeTone} message={notice} />}

      <SectionHeader title="Resumo do dia" />
      <View style={styles.metrics}>
        <MetricCard label="Calorias" value={`${formatAmount(totals.caloriesKcal)} kcal`} detail={goalDetail(totals.caloriesKcal, dailyGoals.caloriesKcal)} />
        <MetricCard label="Proteína" value={`${formatAmount(totals.proteinGrams)} g`} detail={goalDetail(totals.proteinGrams, dailyGoals.proteinGrams)} />
        <MetricCard label="Carboidratos" value={`${formatAmount(totals.carbohydratesGrams)} g`} detail={goalDetail(totals.carbohydratesGrams, dailyGoals.carbohydratesGrams)} />
        <MetricCard label="Gordura" value={`${formatAmount(totals.fatGrams)} g`} detail={goalDetail(totals.fatGrams, dailyGoals.fatGrams)} />
        <MetricCard label="Fibras" value={`${formatAmount(totals.fiberGrams)} g`} detail={goalDetail(totals.fiberGrams, dailyGoals.fiberGrams)} />
      </View>
      <Text style={styles.helper}>
        {summary?.mealCount ?? meals.length} refeição(ões) neste dia. Metas são definidas por você; o app não faz prescrição nutricional.
      </Text>

      <SectionHeader title="Últimos 7 dias" />
      {!recentSummaries.length ? (
        <Text style={styles.helper}>Os resumos aparecem aqui depois que você registrar refeições.</Text>
      ) : (
        <View style={styles.historyList}>
          {recentSummaries.map((entry) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: entry.localDate === date }}
              key={entry.localDate}
              onPress={() => selectDate(entry.localDate)}
              style={[styles.historyRow, entry.localDate === date && styles.historyRowSelected]}
            >
              <View style={styles.historyDate}>
                <Text style={styles.historyDateText}>{shortDate(entry.localDate)}</Text>
                <Text style={styles.historyMeta}>{entry.mealCount} refeições</Text>
              </View>
              <View style={styles.historyTotals}>
                <Text style={styles.historyCalories}>{formatAmount(entry.totalCaloriesKcal)} kcal</Text>
                <Text style={styles.historyMeta}>{formatAmount(entry.totalProteinGrams)} g proteína</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Adicionar refeição" />
      <View style={styles.actions}>
        <Action label="Câmera · estimar com IA" onPress={() => void runPhotoEstimate('CAMERA')} disabled={aiBusy} />
        <Action label="Galeria · estimar com IA" onPress={() => void runPhotoEstimate('GALLERY')} disabled={aiBusy} />
        <Action label="Adicionar manualmente" primary onPress={() => setEditing(newMeal(date))} disabled={aiBusy} />
      </View>

      <SectionHeader title="Refeições" />
      {!meals.length ? (
        summary ? (
          <EmptyState title="Os detalhes desta data expiraram." description="O resumo diário continua salvo; os itens de refeição são mantidos por sete dias." />
        ) : (
          <EmptyState title="Nenhuma refeição registrada neste dia." description="Registre manualmente para começar seu resumo local." />
        )
      ) : meals.map((meal) => (
        <View key={meal.id} style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <StatusPill label={mealTypeLabel(meal.mealType)} />
            <Text style={styles.time}>{new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.mealTitle}>{meal.title || 'Refeição sem título'}</Text>
          <Text style={styles.detail}>
            {meal.items.length} item(ns) · {formatAmount(sumMeal(meal, 'caloriesKcal'))} kcal · {formatAmount(sumMeal(meal, 'proteinGrams'))} g proteína
          </Text>
          {!!meal.notes && <Text style={styles.detail}>{meal.notes}</Text>}
          <View style={styles.row}>
            <Action label="Abrir / editar" onPress={() => setEditing(meal)} />
            <Action label="Excluir" onPress={() => removeMeal(meal)} danger />
          </View>
        </View>
      ))}

      <SectionHeader title="Metas nutricionais" />
      <Text style={styles.helper}>Defina valores pessoais para acompanhar. Eles não são recomendações médicas.</Text>
      <GoalFields goals={goals} onSave={setGoal} />

      <SectionHeader title="Sugestões de cardápio com IA" />
      <Text style={styles.helper}>
        Opcional e requer internet. Metas e preferências digitadas só são enviadas após sua confirmação. As sugestões são genéricas e precisam ser revisadas.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showAiSettings }}
        onPress={() => setShowAiSettings((current) => !current)}
        style={styles.settingsToggle}
      >
        <View style={styles.settingsCopy}>
          <Text style={styles.settingsTitle}>Gemini</Text>
          <Text style={styles.helper}>{apiKeyConfigured ? 'Chave pessoal salva neste aparelho' : 'Configure uma chave sua para ativar as sugestões'}</Text>
        </View>
        <Text style={styles.settingsArrow}>{showAiSettings ? '−' : '+'}</Text>
      </Pressable>
      {showAiSettings && (
        <View style={styles.settingsCard}>
          <Text style={styles.bodyText}>A chave fica no armazenamento seguro do Android e não entra no banco nem nos backups. Em cada solicitação, ela é enviada ao Google Gemini para autenticação; o provedor controla suas cotas e possíveis custos.</Text>
          {apiKeyConfigured && !editingKey ? (
            <View style={styles.row}>
              <Action label="Trocar chave" onPress={() => { setEditingKey(true); setKeyEntry(''); setShowAiSettings(true) }} />
              <Action label="Remover chave" onPress={removeApiKey} danger />
            </View>
          ) : (
            <>
              <Field label="Chave pessoal da Gemini API" value={keyEntry} onChangeText={setKeyEntry} secureTextEntry autoCapitalize="none" autoCorrect={false} />
              <Action label={savingKey ? 'Salvando…' : 'Salvar chave neste aparelho'} primary onPress={() => void saveApiKey()} disabled={savingKey || !keyEntry.trim()} />
            </>
          )}
          <Text style={styles.privacyNote}>Antes de cada envio, o app explica quais dados serão compartilhados. Revise também os termos atuais do provedor.</Text>
          <Text style={styles.privacyNote}>Use uma chave dedicada e não a compartilhe. Como a chamada ocorre no celular, uma chave pessoal pode ser exposta se o aparelho estiver comprometido; restrinja ou revogue a chave na conta do provedor quando necessário.</Text>
        </View>
      )}
      <Field
        label="Preferências para a sugestão (opcional, até 500 caracteres)"
        value={preferences}
        onChangeText={setPreferences}
        multiline
        maxLength={500}
        placeholder="Ex.: refeições vegetarianas e preparo simples"
      />
      <View style={styles.row}>
        <Action label="Gerar sugestão de um dia" primary onPress={() => void generateDietSuggestion()} disabled={aiBusy} />
        {aiBusy && <Action label="Cancelar solicitação" onPress={cancelAi} />}
      </View>

      {dietSuggestion && (
        <EditableDietSuggestion
          suggestion={dietSuggestion}
          busy={aiBusy}
          editingSaved={editingMenuId !== null}
          onChange={setDietSuggestion}
          onSave={() => void saveDietSuggestion()}
          onDiscard={() => { setDietSuggestion(null); setEditingMenuId(null) }}
        />
      )}

      {!!savedMenus.length && (
        <>
          <SectionHeader title="Sugestões salvas neste aparelho" />
          {savedMenus.map((menu) => (
            <View key={menu.id} style={styles.mealCard}>
              <Text style={styles.mealTitle}>{menu.suggestion.title}</Text>
              <Text style={styles.detail}>{menu.suggestion.meals.length} refeições · salva em {new Date(menu.createdAt).toLocaleDateString('pt-BR')}</Text>
              <Text style={styles.bodyText}>{menu.suggestion.summary}</Text>
              <View style={styles.row}>
                <Action label="Editar sugestão" onPress={() => { setEditingMenuId(menu.id); setDietSuggestion(menu.suggestion) }} />
                <Action label="Excluir" danger onPress={() => deleteSavedMenu(menu.id)} />
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenScrollView>
  )
}

function MealForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: NutritionMeal
  onCancel: () => void
  onSave: (input: NutritionMealInput) => Promise<void>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [meal, setMeal] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const updateItem = (index: number, field: keyof NutritionMealItemInput, value: string | number | null) => {
    setMeal((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }
  const submit = async () => {
    setError('')
    const hasInvalidItem = !meal.items.length || meal.items.some((item) =>
      !item.name.trim()
      || [item.caloriesKcal, item.proteinGrams, item.carbohydratesGrams, item.fatGrams, item.fiberGrams]
        .some((value) => !Number.isFinite(value) || value < 0)
      || (item.estimatedGrams !== null && (!Number.isFinite(item.estimatedGrams) || item.estimatedGrams < 0)),
    )
    if (hasInvalidItem) {
      setError('Informe pelo menos um alimento e valores numéricos iguais ou maiores que zero.')
      return
    }
    setBusy(true)
    try {
      await onSave({
        localDate: meal.localDate,
        consumedAt: meal.consumedAt,
        mealType: meal.mealType,
        title: meal.title,
        notes: meal.notes,
        source: meal.source,
        items: meal.items.map((item, index) => ({ ...item, sortOrder: index })),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a refeição.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenScrollView>
      <ScreenHeader
        eyebrow="Nutrição · local"
        title={initial.id ? 'Editar refeição' : initial.source === 'MANUAL' ? 'Adicionar refeição' : 'Revisar refeição'}
        description={initial.source === 'MANUAL' ? 'Os valores são informados por você.' : 'Estimativa aproximada. Revise cada item antes de salvar.'}
      />
      {!!error && <InlineNotice tone="danger" message={error} />}
      <Text style={styles.label}>Tipo da refeição</Text>
      <View style={styles.actions}>
        {MEAL_TYPES.map((type) => (
          <Action key={type} label={mealTypeLabel(type)} primary={meal.mealType === type} onPress={() => setMeal({ ...meal, mealType: type })} />
        ))}
      </View>
      <Field label="Título (opcional)" value={meal.title} onChangeText={(title) => setMeal({ ...meal, title })} />
      <Field label="Observações" value={meal.notes} onChangeText={(notes) => setMeal({ ...meal, notes })} multiline />
      <SectionHeader title="Alimentos e valores" />
      {meal.items.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <Field label="Alimento" value={item.name} onChangeText={(value) => updateItem(index, 'name', value)} />
          <Field label="Porção" value={item.portionDescription} onChangeText={(value) => updateItem(index, 'portionDescription', value)} />
          <NumberField label="Peso estimado (g, opcional)" value={item.estimatedGrams} emptyValue={null} onChangeValue={(value) => updateItem(index, 'estimatedGrams', value)} />
          <View style={styles.two}>
            <View style={styles.twoChild}><NumberField label="Calorias (kcal)" value={item.caloriesKcal} emptyValue={0} onChangeValue={(value) => updateItem(index, 'caloriesKcal', value)} /></View>
            <View style={styles.twoChild}><NumberField label="Proteína (g)" value={item.proteinGrams} emptyValue={0} onChangeValue={(value) => updateItem(index, 'proteinGrams', value)} /></View>
          </View>
          <View style={styles.two}>
            <View style={styles.twoChild}><NumberField label="Carboidratos (g)" value={item.carbohydratesGrams} emptyValue={0} onChangeValue={(value) => updateItem(index, 'carbohydratesGrams', value)} /></View>
            <View style={styles.twoChild}><NumberField label="Gordura (g)" value={item.fatGrams} emptyValue={0} onChangeValue={(value) => updateItem(index, 'fatGrams', value)} /></View>
          </View>
          <NumberField label="Fibras (g)" value={item.fiberGrams} emptyValue={0} onChangeValue={(value) => updateItem(index, 'fiberGrams', value)} />
          {item.dataSource === 'AI_ESTIMATE' && <Text style={styles.privacyNote}>Estimativa de IA · confiança informada: {item.confidence == null ? 'não informada' : `${Math.round(item.confidence * 100)}%`}</Text>}
          {meal.items.length > 1 && <Action label="Remover alimento" danger onPress={() => setMeal({ ...meal, items: meal.items.filter((_, itemIndex) => itemIndex !== index) })} />}
        </View>
      ))}
      <View style={styles.row}>
        <Action label="Adicionar alimento" onPress={() => setMeal({ ...meal, items: [...meal.items, withMealItemIds(emptyItem(), meal.items.length)] })} />
        <Action label={busy ? 'Salvando…' : 'Salvar refeição'} primary onPress={() => void submit()} disabled={busy} />
        <Action label="Cancelar" onPress={onCancel} disabled={busy} />
      </View>
    </ScreenScrollView>
  )
}

function GoalFields({ goals, onSave }: { goals: NutritionGoals; onSave: (value: NutritionGoals) => Promise<void> }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [values, setValues] = useState(goals)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const goalsKey = JSON.stringify(goals)
  // Só ressincroniza quando o conteúdo salvo muda, para não descartar edições em andamento.
  useEffect(() => setValues(goals), [goalsKey])
  const change = (key: keyof NutritionGoals, value: number | null) => {
    setValues((current) => ({ ...current, [key]: value }))
  }
  const save = async () => {
    if (Object.values(values).some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      setError('As metas devem ser números iguais ou maiores que zero.')
      return
    }
    setError('')
    setBusy(true)
    try { await onSave(values) } finally { setBusy(false) }
  }
  return (
    <View>
      {!!error && <InlineNotice tone="danger" message={error} />}
      <NumberField label="Calorias (kcal)" value={values.caloriesKcal} emptyValue={null} onChangeValue={(value) => change('caloriesKcal', value)} />
      <View style={styles.two}>
        <View style={styles.twoChild}><NumberField label="Proteína (g)" value={values.proteinGrams} emptyValue={null} onChangeValue={(value) => change('proteinGrams', value)} /></View>
        <View style={styles.twoChild}><NumberField label="Carboidratos (g)" value={values.carbohydratesGrams} emptyValue={null} onChangeValue={(value) => change('carbohydratesGrams', value)} /></View>
      </View>
      <View style={styles.two}>
        <View style={styles.twoChild}><NumberField label="Gordura (g)" value={values.fatGrams} emptyValue={null} onChangeValue={(value) => change('fatGrams', value)} /></View>
        <View style={styles.twoChild}><NumberField label="Fibras (g)" value={values.fiberGrams} emptyValue={null} onChangeValue={(value) => change('fiberGrams', value)} /></View>
      </View>
      <Action label={busy ? 'Salvando…' : 'Salvar metas'} primary onPress={() => void save()} disabled={busy} />
    </View>
  )
}

function EditableDietSuggestion({
  suggestion,
  busy,
  editingSaved,
  onChange,
  onSave,
  onDiscard,
}: {
  suggestion: NutritionAiDietSuggestion
  busy: boolean
  editingSaved: boolean
  onChange: (value: NutritionAiDietSuggestion) => void
  onSave: () => void
  onDiscard: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [error, setError] = useState('')
  const updateItem = (mealIndex: number, itemIndex: number, field: keyof NutritionMealItemInput, nextValue: string | number | null) => {
    onChange({
      ...suggestion,
      meals: suggestion.meals.map((meal, currentMealIndex) => currentMealIndex !== mealIndex ? meal : ({
        ...meal,
        items: meal.items.map((item, currentItemIndex) => currentItemIndex === itemIndex ? { ...item, [field]: nextValue } : item),
      })),
    })
  }
  return (
    <View style={styles.suggestionCard}>
      <Text style={styles.eyebrow}>RASCUNHO · REVISE ANTES DE SALVAR</Text>
      <Field label="Título" value={suggestion.title} onChangeText={(title) => onChange({ ...suggestion, title })} />
      <Field label="Resumo" value={suggestion.summary} onChangeText={(summary) => onChange({ ...suggestion, summary })} multiline />
      {suggestion.meals.map((meal, mealIndex) => (
        <View key={`${mealIndex}-${meal.mealType}`} style={styles.itemCard}>
          <Text style={styles.mealTitle}>{mealTypeLabel(meal.mealType)}</Text>
          <Field label="Nome da refeição" value={meal.title} onChangeText={(title) => onChange({ ...suggestion, meals: suggestion.meals.map((item, index) => index === mealIndex ? { ...item, title } : item) })} />
          {meal.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.nestedItem}>
              <Field label="Alimento" value={item.name} onChangeText={(value) => updateItem(mealIndex, itemIndex, 'name', value)} />
              <Field label="Porção" value={item.portionDescription} onChangeText={(value) => updateItem(mealIndex, itemIndex, 'portionDescription', value)} />
              <View style={styles.two}>
                <View style={styles.twoChild}><NumberField label="Calorias" value={item.caloriesKcal} emptyValue={0} onChangeValue={(value) => updateItem(mealIndex, itemIndex, 'caloriesKcal', value)} /></View>
                <View style={styles.twoChild}><NumberField label="Proteína (g)" value={item.proteinGrams} emptyValue={0} onChangeValue={(value) => updateItem(mealIndex, itemIndex, 'proteinGrams', value)} /></View>
              </View>
              <View style={styles.two}>
                <View style={styles.twoChild}><NumberField label="Carboidratos (g)" value={item.carbohydratesGrams} emptyValue={0} onChangeValue={(value) => updateItem(mealIndex, itemIndex, 'carbohydratesGrams', value)} /></View>
                <View style={styles.twoChild}><NumberField label="Gordura (g)" value={item.fatGrams} emptyValue={0} onChangeValue={(value) => updateItem(mealIndex, itemIndex, 'fatGrams', value)} /></View>
              </View>
              <NumberField label="Fibras (g)" value={item.fiberGrams} emptyValue={0} onChangeValue={(value) => updateItem(mealIndex, itemIndex, 'fiberGrams', value)} />
              {meal.items.length > 1 && (
                <Action label="Remover alimento" danger onPress={() => onChange({
                  ...suggestion,
                  meals: suggestion.meals.map((entry, index) => index === mealIndex
                    ? { ...entry, items: entry.items.filter((_, index) => index !== itemIndex) }
                    : entry),
                })} />
              )}
            </View>
          ))}
          <View style={styles.row}>
            <Action label="Adicionar alimento" onPress={() => onChange({
              ...suggestion,
              meals: suggestion.meals.map((entry, index) => index === mealIndex
                ? { ...entry, items: [...entry.items, { ...emptyItem(), dataSource: 'AI_ESTIMATE' }] }
                : entry),
            })} />
            {suggestion.meals.length > 1 && (
              <Action label="Remover refeição" danger onPress={() => onChange({
                ...suggestion,
                meals: suggestion.meals.filter((_, index) => index !== mealIndex),
              })} />
            )}
          </View>
        </View>
      ))}
      {!!error && <InlineNotice tone="danger" message={error} />}
      <Text style={styles.privacyNote}>Esta sugestão é genérica e aproximada. Não é diagnóstico, prescrição ou substituto de acompanhamento profissional.</Text>
      <View style={styles.row}>
        <Action label={editingSaved ? 'Salvar alterações' : 'Salvar sugestão local'} primary onPress={() => {
          if (!isEditableSuggestionValid(suggestion)) {
            setError('Revise título, alimentos e valores antes de salvar.')
            return
          }
          setError('')
          onSave()
        }} disabled={busy} />
        <Action label="Descartar" onPress={onDiscard} disabled={busy} />
      </View>
    </View>
  )
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const { label, ...inputProps } = props
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        style={[styles.input, inputProps.multiline && styles.multilineInput]}
      />
    </View>
  )
}

function NumberField({
  label,
  value,
  emptyValue,
  onChangeValue,
}: {
  label: string
  value: number | null
  emptyValue: number | null
  onChangeValue: (value: number | null) => void
}) {
  const [text, setText] = useState(() => formatNumberInput(value))
  // Mantém o texto digitado ("1.", "") enquanto ele representa o valor atual; só reescreve em mudanças externas.
  useEffect(() => {
    setText((current) => Object.is(parseNumberInput(current, emptyValue), value) ? current : formatNumberInput(value))
  }, [value, emptyValue])
  return (
    <Field
      label={label}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(next) => {
        setText(next)
        onChangeValue(parseNumberInput(next, emptyValue))
      }}
    />
  )
}

function Action({
  label,
  onPress,
  primary,
  danger,
  disabled,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  primary?: boolean
  danger?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        danger && styles.actionDanger,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <Text style={[styles.actionText, primary && styles.actionPrimaryText, danger && styles.actionDangerText]}>{label}</Text>
    </Pressable>
  )
}

function DateStep({ label, onPress, previous = false, disabled = false }: { label: string; onPress: () => void; previous?: boolean; disabled?: boolean }) {
  const { colors } = useTheme()
  const Icon = previous ? ChevronLeft : ChevronRight
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48, opacity: disabled ? 0.35 : 1 }}>
      <Icon color={colors.tx} size={20} strokeWidth={1.6} />
    </Pressable>
  )
}

function newMeal(date: string): NutritionMeal {
  return {
    id: 0,
    localDate: date,
    consumedAt: consumedAtForDate(date),
    mealType: 'OTHER',
    title: '',
    notes: '',
    source: 'MANUAL',
    createdAt: '',
    updatedAt: '',
    items: [withMealItemIds(emptyItem(), 0)],
  }
}

function confirmAiSend(kind: 'photo' | 'menu') {
  const purpose = kind === 'photo'
    ? 'A imagem escolhida e as instruções de análise'
    : 'As metas nutricionais configuradas e as preferências digitadas'
  const imageNote = kind === 'photo' ? 'A imagem não será guardada pelo app. ' : ''
  return new Promise<boolean>((resolve) => Alert.alert(
    'Enviar dados ao Google Gemini?',
    `${purpose} serão enviados ao Google Gemini, e sua chave pessoal será usada para autenticar a chamada. Na cota gratuita, o provedor pode usar entradas e respostas para melhorar os serviços e permitir revisão humana. ${imageNote}O resultado é aproximado e precisa ser revisado. Deseja enviar agora?`,
    [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Enviar agora', onPress: () => resolve(true) },
    ],
    { cancelable: true, onDismiss: () => resolve(false) },
  ))
}

function normalizeImageMime(
  value: string | undefined,
  fileName: string | undefined,
  uri: string,
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (value === 'image/jpeg' || value === 'image/png' || value === 'image/webp') return value
  const source = `${fileName ?? ''} ${uri}`.toLowerCase()
  if (/\.jpe?g(?:[?#]|$)/.test(source)) return 'image/jpeg'
  if (/\.png(?:[?#]|$)/.test(source)) return 'image/png'
  if (/\.webp(?:[?#]|$)/.test(source)) return 'image/webp'
  return null
}

function deleteTemporaryImage(uri: string) {
  try {
    const cacheUri = Paths.cache.uri.replace(/\/?$/, '/')
    if (!uri.startsWith(cacheUri)) return
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {
    // The provider request has finished; stale temporary cache files are cleaned by the OS.
  }
}

function readGoals(value: unknown): NutritionGoals {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_GOALS
  const input = value as Record<string, unknown>
  const goal = (key: keyof NutritionGoals) => typeof input[key] === 'number' && Number.isFinite(input[key]) && (input[key] as number) >= 0 ? input[key] as number : null
  return {
    caloriesKcal: goal('caloriesKcal'), proteinGrams: goal('proteinGrams'),
    carbohydratesGrams: goal('carbohydratesGrams'), fatGrams: goal('fatGrams'), fiberGrams: goal('fiberGrams'),
  }
}

function normalizeGoals(value: NutritionGoals): NutritionGoals {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    item === null || !Number.isFinite(item) || item <= 0 ? null : item,
  ])) as NutritionGoals
}

function readSavedMenus(value: unknown): SavedMenu[] {
  if (!Array.isArray(value)) return []
  return value.filter(isSavedMenu).slice(0, 20)
}

function isEditableSuggestionValid(suggestion: NutritionAiDietSuggestion) {
  return Boolean(suggestion.title.trim() && suggestion.summary.trim())
    && suggestion.meals.length > 0
    && suggestion.meals.every((meal) => meal.title.trim() && meal.items.length > 0 && meal.items.every((item) =>
      item.name.trim()
      && [item.caloriesKcal, item.proteinGrams, item.carbohydratesGrams, item.fatGrams, item.fiberGrams]
        .every((value) => Number.isFinite(value) && value >= 0)
      && (item.estimatedGrams === null || (Number.isFinite(item.estimatedGrams) && item.estimatedGrams >= 0)),
    ))
}

function isSavedMenu(value: unknown): value is SavedMenu {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.createdAt !== 'string') return false
  const suggestion = candidate.suggestion
  if (!suggestion || typeof suggestion !== 'object' || Array.isArray(suggestion)) return false
  const plan = suggestion as Record<string, unknown>
  return typeof plan.title === 'string'
    && plan.title.trim().length > 0
    && typeof plan.summary === 'string'
    && plan.summary.trim().length > 0
    && Array.isArray(plan.meals)
    && plan.meals.length > 0
    && plan.meals.length <= 8
    && plan.meals.every((meal) => {
      if (!meal || typeof meal !== 'object' || Array.isArray(meal)) return false
      const item = meal as Record<string, unknown>
      return MEAL_TYPES.includes(item.mealType as NutritionMealType)
        && typeof item.title === 'string'
        && Array.isArray(item.items)
        && item.items.length > 0
        && item.items.length <= 30
        && item.items.every(isSavedMenuItem)
    })
}

function isSavedMenuItem(value: unknown): value is NutritionMealItemInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  const numericFields = ['caloriesKcal', 'proteinGrams', 'carbohydratesGrams', 'fatGrams', 'fiberGrams']
  return typeof item.name === 'string'
    && item.name.trim().length > 0
    && typeof item.portionDescription === 'string'
    && (item.estimatedGrams === null || (typeof item.estimatedGrams === 'number' && Number.isFinite(item.estimatedGrams) && item.estimatedGrams >= 0))
    && numericFields.every((key) => typeof item[key] === 'number' && Number.isFinite(item[key]) && (item[key] as number) >= 0)
    && item.micronutrients !== null
    && typeof item.micronutrients === 'object'
    && !Array.isArray(item.micronutrients)
    && Object.values(item.micronutrients as Record<string, unknown>).every((number) => typeof number === 'number' && Number.isFinite(number) && number >= 0)
    && (item.confidence === null || (typeof item.confidence === 'number' && Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 1))
    && ['MANUAL', 'LOCAL_DATABASE', 'USDA', 'OPEN_FOOD_FACTS', 'AI_ESTIMATE'].includes(String(item.dataSource))
    && Number.isInteger(item.sortOrder) && (item.sortOrder as number) >= 0
}

type NutrientKey = 'caloriesKcal' | 'proteinGrams' | 'carbohydratesGrams' | 'fatGrams' | 'fiberGrams'
type NutrientTotals = Record<NutrientKey, number>

function withMealItemIds(item: NutritionMealItemInput, index: number, mealId = 0): NutritionMealItem {
  return { ...item, id: index + 1, mealId, createdAt: '', updatedAt: '' }
}

function sumItems(items: NutritionMeal[]): NutrientTotals {
  return items.reduce((total, meal) => ({
    caloriesKcal: total.caloriesKcal + sumMeal(meal, 'caloriesKcal'),
    proteinGrams: total.proteinGrams + sumMeal(meal, 'proteinGrams'),
    carbohydratesGrams: total.carbohydratesGrams + sumMeal(meal, 'carbohydratesGrams'),
    fatGrams: total.fatGrams + sumMeal(meal, 'fatGrams'),
    fiberGrams: total.fiberGrams + sumMeal(meal, 'fiberGrams'),
  }), { caloriesKcal: 0, proteinGrams: 0, carbohydratesGrams: 0, fatGrams: 0, fiberGrams: 0 })
}

function sumMeal(meal: NutritionMeal, key: NutrientKey): number {
  return meal.items.reduce((total, item) => total + item[key], 0)
}

function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + delta)
  return localDateKey(next)
}

function goalDetail(value: number, goal: number | null) {
  if (!goal || goal <= 0) return undefined
  return `${Math.round(value / goal * 100)}% da meta de ${formatAmount(goal)}`
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function readableDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function mealTypeLabel(type: NutritionMealType) {
  return {
    BREAKFAST: 'Café da manhã', MORNING_SNACK: 'Lanche da manhã', LUNCH: 'Almoço',
    AFTERNOON_SNACK: 'Lanche da tarde', DINNER: 'Jantar', SUPPER: 'Ceia', OTHER: 'Outro',
  }[type]
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  dateRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  selectedDate: { ...typography.numberMedium, color: colors.tx, flex: 1, textAlign: 'center' },
  metrics: { columnGap: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 0 },
  helper: { ...typography.bodySmall, color: colors.t2, marginVertical: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  historyList: { gap: 0 },
  historyRow: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingVertical: 8 },
  historyRowSelected: { backgroundColor: colors.s2 },
  historyDate: { flex: 1 },
  historyDateText: { ...typography.bodySmall, color: colors.tx },
  historyTotals: { alignItems: 'flex-end' },
  historyCalories: { ...typography.numberSmall, color: colors.tx },
  historyMeta: { ...typography.captionSmall, color: colors.t2, marginTop: 2 },
  mealCard: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8, paddingVertical: 12 },
  mealHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  time: { ...typography.numberSmall, color: colors.t2 },
  mealTitle: { ...typography.body, color: colors.tx, fontWeight: '500', marginTop: 8 },
  detail: { ...typography.bodySmall, color: colors.t2, marginVertical: 4 },
  label: { ...typography.captionSmall, color: colors.t2, marginBottom: 4 },
  fieldWrap: { flex: 1, marginBottom: 10, minWidth: 0 },
  input: { ...typography.body, backgroundColor: colors.s1, borderColor: colors.mu, borderRadius: 12, borderWidth: 1, color: colors.tx, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  multilineInput: { minHeight: 88, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 8 },
  twoChild: { flex: 1, minWidth: 0 },
  itemCard: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 12, paddingBottom: 12 },
  nestedItem: { borderTopColor: colors.bd, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 10 },
  bodyText: { ...typography.bodySmall, color: colors.tx, lineHeight: 21, marginVertical: 8 },
  privacyNote: { ...typography.caption, color: colors.t2, lineHeight: 18, marginVertical: 8 },
  settingsToggle: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6, minHeight: 56 },
  settingsCopy: { flex: 1, paddingRight: 12 },
  settingsTitle: { ...typography.label, color: colors.tx, fontWeight: '500' },
  settingsArrow: { color: colors.tx, fontFamily: typography.titleSmall.fontFamily, fontSize: 22 },
  settingsCard: { backgroundColor: colors.s1, borderRadius: 12, marginBottom: 12, padding: 12 },
  suggestionCard: { backgroundColor: colors.s1, borderRadius: 12, marginVertical: 12, padding: 12 },
  eyebrow: { ...typography.monoLabel, color: colors.t2, marginBottom: 12 },
  action: { alignItems: 'center', backgroundColor: 'transparent', borderColor: colors.mu, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  actionPrimary: { backgroundColor: colors.ac, borderColor: colors.ac },
  actionDanger: { borderColor: colors.dg },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.76 },
  actionText: { ...typography.labelSmall, color: colors.tx, textAlign: 'center' },
  actionPrimaryText: { color: colors.on },
  actionDangerText: { color: colors.dg },
})

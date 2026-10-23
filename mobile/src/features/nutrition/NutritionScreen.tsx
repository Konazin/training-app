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
import { BottomSheet, EmptyState, InlineNotice, SegmentedControl, StatusPill } from '../../components/ui'
import { AnimatedNumber, PressableScale, ProgressBar, ProgressRing, Reveal } from '../../motion'
import { ScreenScrollView } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { useTheme, type ThemeColors } from '../../theme'
import { typography } from '../../theme/typography'
import { createGeminiNutritionProvider } from './geminiNutritionProvider'
import { GEMINI_API_KEY_SECRET } from '../../integrations/secureSecrets'
import { cloneMealInput, consumedAtForDate, consumedAtFromTime, formatNumberInput, parseNumberInput, parseTimeInput, timeOfDay } from './nutritionInput'
import {
  addFavoriteMeal, adjustHydration, favoriteToMealInput, FAVORITE_MEALS_KEY, formatLiters,
  type FavoriteMeal, HYDRATION_KEY, readFavoriteMeals, readHydration, removeFavoriteMeal, type HydrationLog,
} from './nutritionExtras'

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
  secretsRevision = 0,
  onOpenAiSettings,
}: {
  repositories: LocalRepositories
  secrets: SecretsRepository
  secretsRevision?: number
  onOpenAiSettings: () => void
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
  const [preferences, setPreferences] = useState('')
  const [dietSuggestion, setDietSuggestion] = useState<NutritionAiDietSuggestion | null>(null)
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [tab, setTab] = useState<'DAY' | 'GOALS' | 'AI'>('DAY')
  const [addSheet, setAddSheet] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [hydration, setHydration] = useState<HydrationLog>({})
  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const today = localDateKey(new Date())

  const refresh = useCallback(async () => {
    const operation = ++requestId.current
    setLoading(true)
    try {
      const [nextMeals, nextSummary, storedGoals, recent, storedMenus, storedFavorites, storedHydration] = await Promise.all([
        repositories.nutritionMeals.listByDate(date),
        repositories.nutritionSummaries.findByDate(date),
        repositories.settings.get<unknown>(NUTRITION_GOALS_KEY),
        repositories.nutritionSummaries.listBetweenDates(addDays(date, -6), date),
        repositories.settings.get<unknown>(SAVED_MENUS_KEY),
        repositories.settings.get<unknown>(FAVORITE_MEALS_KEY),
        repositories.settings.get<unknown>(HYDRATION_KEY),
      ])
      if (!mounted.current || operation !== requestId.current) return
      setMeals(nextMeals)
      setSummary(nextSummary)
      setGoals(readGoals(storedGoals))
      setRecentSummaries(recent)
      setSavedMenus(readSavedMenus(storedMenus))
      setFavorites(readFavoriteMeals(storedFavorites))
      setHydration(readHydration(storedHydration))
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
      }
    }).catch(() => {
      if (mounted.current) {
        setNotice('O armazenamento seguro não está disponível neste aparelho.')
        setNoticeTone('danger')
      }
    })
  }, [secrets, secretsRevision])

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

  const saveFavorites = async (next: FavoriteMeal[], message: string) => {
    try {
      await repositories.settings.set(FAVORITE_MEALS_KEY, next)
      setFavorites(next)
      setNotice(message)
      setNoticeTone('success')
    } catch {
      setNotice('Não foi possível atualizar as favoritas.')
      setNoticeTone('danger')
    }
  }

  const addFavorite = async (favorite: FavoriteMeal) => {
    try {
      await repositories.nutritionMeals.create(favoriteToMealInput(favorite, date))
      await repositories.nutritionMaintenance.aggregateDay(date)
      setAddSheet(false)
      setNotice(`"${favorite.title}" adicionada. Ajuste o que mudou.`)
      setNoticeTone('success')
      await refresh()
    } catch {
      setNotice('Não foi possível adicionar a refeição favorita.')
      setNoticeTone('danger')
    }
  }

  const changeWater = async (deltaMl: number) => {
    const next = adjustHydration(hydration, date, deltaMl)
    try {
      await repositories.settings.set(HYDRATION_KEY, next)
      setHydration(next)
    } catch {
      setNotice('Não foi possível salvar a água.')
      setNoticeTone('danger')
    }
  }

  const duplicateMeal = async (meal: NutritionMeal) => {
    try {
      await repositories.nutritionMeals.create(cloneMealInput(meal, date, consumedAtForDate(date)))
      await repositories.nutritionMaintenance.aggregateDay(date)
      setNotice('Refeição duplicada. Ajuste o que mudou.')
      setNoticeTone('success')
      await refresh()
    } catch {
      setNotice('Não foi possível duplicar a refeição.')
      setNoticeTone('danger')
    }
  }

  const copyPreviousDay = async () => {
    const from = addDays(date, -1)
    try {
      const previous = await repositories.nutritionMeals.listByDate(from)
      if (!previous.length) {
        setNotice('Não há refeições detalhadas no dia anterior (os itens são mantidos por sete dias).')
        setNoticeTone('warning')
        return
      }
      for (const meal of previous) {
        await repositories.nutritionMeals.create(
          cloneMealInput(meal, date, consumedAtFromTime(date, timeOfDay(meal.consumedAt))),
        )
      }
      await repositories.nutritionMaintenance.aggregateDay(date)
      setNotice(`${previous.length} refeição(ões) copiada(s) do dia anterior.`)
      setNoticeTone('success')
      await refresh()
    } catch {
      setNotice('Não foi possível copiar o dia anterior.')
      setNoticeTone('danger')
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
      const zeroed = Object.values(next).some((value) => value === 0)
      setNotice(zeroed ? 'Metas salvas. Valores iguais a zero foram tratados como "sem meta".' : 'Metas salvas neste aparelho.')
      setNoticeTone('success')
      await refresh()
    } catch {
      setNotice('Não foi possível salvar as metas.')
      setNoticeTone('danger')
    }
  }

  const runPhotoEstimate = async (source: 'CAMERA' | 'GALLERY') => {
    let temporaryImageUri: string | null = null
    try {
      const key = await secrets.get(GEMINI_API_KEY_SECRET)
      if (!key) {
        onOpenAiSettings()
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
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.4, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.4, base64: true })
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
    try {
      const key = await secrets.get(GEMINI_API_KEY_SECRET)
      if (!key) {
        onOpenAiSettings()
        return
      }
      setAiBusy(true)
      if (!await confirmAiSend('menu')) return
      const controller = new AbortController()
      activeRequest.current = controller
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
      <Reveal>
        <ScreenHeader title="Nutrição" description="Acompanhamento local, sem prescrição." />
      </Reveal>
      <View style={styles.tabs}>
        <SegmentedControl
          label="Seção da nutrição"
          onChange={setTab}
          options={[{ value: 'DAY', label: 'Dia' }, { value: 'GOALS', label: 'Metas' }, { value: 'AI', label: 'IA' }]}
          value={tab}
        />
      </View>

      {!!notice && <InlineNotice tone={noticeTone === 'success' ? 'success' : noticeTone} message={notice} />}

      {tab === 'DAY' && (
        <>
          <View style={styles.dateRow}>
            <DateStep label="Dia anterior" onPress={() => changeDate(-1)} previous />
            <Text accessibilityRole="header" style={styles.selectedDate}>{date === today ? 'Hoje' : readableDate(date)}</Text>
            <DateStep label="Próximo dia" onPress={() => changeDate(1)} disabled={date >= today} />
          </View>
          {date !== today && <Action label="Hoje" onPress={() => selectDate(today)} />}

          <MacroSummary totals={totals} goals={dailyGoals} mealCount={summary?.mealCount ?? meals.length} />

          <View accessibilityLabel={`Água do dia: ${formatLiters(hydration[date] ?? 0)}`} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>Água</Text>
              <Text accessibilityLiveRegion="polite" style={styles.time}>{formatLiters(hydration[date] ?? 0)}</Text>
            </View>
            <View style={styles.row}>
              <Action label="+ 200 mL" onPress={() => void changeWater(200)} />
              <Action label="+ 500 mL" onPress={() => void changeWater(500)} />
              <Action label="Desfazer 200 mL" onPress={() => void changeWater(-200)} disabled={(hydration[date] ?? 0) <= 0} />
            </View>
          </View>

          <View style={styles.mealsHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Refeições</Text>
            <Action label="Adicionar refeição" primary onPress={() => setAddSheet(true)} disabled={aiBusy} />
          </View>
          {!meals.length ? (
            summary ? (
              <EmptyState title="Os detalhes desta data expiraram." description="O resumo diário continua salvo; os itens de refeição são mantidos por sete dias." />
            ) : (
              <EmptyState
                action={<Action label="Copiar dia anterior" onPress={() => void copyPreviousDay()} />}
                title="Nenhuma refeição registrada neste dia."
                description="Registre manualmente ou copie as refeições de ontem e ajuste o que mudou."
              />
            )
          ) : meals.map((meal, index) => (
            <Reveal index={index} key={meal.id}>
              <View style={styles.mealCard}>
                <PressableScale accessibilityLabel={`Abrir ${meal.title || mealTypeLabel(meal.mealType)}`} accessibilityRole="button" onPress={() => setEditing(meal)} pressedScale={0.99}>
                  <View style={styles.mealHeader}>
                    <StatusPill label={mealTypeLabel(meal.mealType)} />
                    <Text style={styles.time}>{new Date(meal.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={styles.mealTitle}>{meal.title || 'Refeição sem título'}</Text>
                  <Text style={styles.detail}>
                    {meal.items.length} item(ns) · {formatAmount(sumMeal(meal, 'caloriesKcal'))} kcal · {formatAmount(sumMeal(meal, 'proteinGrams'))} g proteína
                  </Text>
                  {!!meal.notes && <Text style={styles.detail}>{meal.notes}</Text>}
                </PressableScale>
                <View style={styles.row}>
                  <Action label="Abrir / editar" onPress={() => setEditing(meal)} />
                  <Action label="Duplicar" onPress={() => void duplicateMeal(meal)} />
                  <Action
                    label="Favoritar"
                    onPress={() => void saveFavorites(addFavoriteMeal(favorites, meal), 'Refeição salva nas favoritas.')}
                  />
                  <Action label="Excluir" onPress={() => removeMeal(meal)} danger />
                </View>
              </View>
            </Reveal>
          ))}

          <Text accessibilityRole="header" style={styles.sectionTitle}>Últimos 7 dias</Text>
          {!recentSummaries.length ? (
            <Text style={styles.helper}>Os resumos aparecem aqui depois que você registrar refeições.</Text>
          ) : (
            <View style={styles.historyList}>
              {recentSummaries.map((entry) => (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityState={{ selected: entry.localDate === date }}
                  key={entry.localDate}
                  onPress={() => selectDate(entry.localDate)}
                  pressedScale={0.99}
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
                </PressableScale>
              ))}
            </View>
          )}
        </>
      )}

      {tab === 'GOALS' && (
        <>
          <Text style={styles.helper}>Defina valores pessoais para acompanhar. Deixe em branco para não definir uma meta. Eles não são recomendações médicas.</Text>
          <GoalFields goals={goals} onSave={setGoal} />
        </>
      )}

      {tab === 'AI' && (
        <>
          <Text style={styles.helper}>
            Opcional e requer internet. Metas e preferências digitadas só são enviadas após sua confirmação. As sugestões são genéricas e precisam ser revisadas.
          </Text>
          <AiKeyRow configured={apiKeyConfigured} onPress={onOpenAiSettings} />
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Sugestões salvas neste aparelho</Text>
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
        </>
      )}

      <BottomSheet title="Adicionar refeição" visible={addSheet} onClose={() => setAddSheet(false)}>
        <View style={styles.sheetActions}>
          <Action label="Adicionar manualmente" primary onPress={() => { setAddSheet(false); setEditing(newMeal(date)) }} disabled={aiBusy} />
          <Action label="Câmera · estimar com IA" onPress={() => { setAddSheet(false); void runPhotoEstimate('CAMERA') }} disabled={aiBusy} />
          <Action label="Galeria · estimar com IA" onPress={() => { setAddSheet(false); void runPhotoEstimate('GALLERY') }} disabled={aiBusy} />
          {!apiKeyConfigured && <AiKeyRow configured={false} onPress={() => { setAddSheet(false); onOpenAiSettings() }} />}
        </View>
        {!!favorites.length && (
          <>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Favoritas</Text>
            {favorites.map((favorite) => (
              <View key={favorite.id} style={styles.row}>
                <Action label={favorite.title} onPress={() => void addFavorite(favorite)} />
                <Action
                  accessibilityLabel={`Remover ${favorite.title} das favoritas`}
                  danger
                  label="Remover"
                  onPress={() => void saveFavorites(removeFavoriteMeal(favorites, favorite.id), 'Favorita removida.')}
                />
              </View>
            ))}
          </>
        )}
      </BottomSheet>
    </ScreenScrollView>
  )
}

/** Resumo do dia: anel de calorias e barras de macros, animados ao abrir e ao mudar o dia. */
function MacroSummary({
  totals,
  goals,
  mealCount,
}: {
  totals: NutrientTotals
  goals: NutritionGoals
  mealCount: number
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const calorieGoal = goals.caloriesKcal && goals.caloriesKcal > 0 ? goals.caloriesKcal : null
  const bars: { label: string; key: NutrientKey; unit: string }[] = [
    { label: 'Proteína', key: 'proteinGrams', unit: 'g' },
    { label: 'Carboidratos', key: 'carbohydratesGrams', unit: 'g' },
    { label: 'Gordura', key: 'fatGrams', unit: 'g' },
    { label: 'Fibras', key: 'fiberGrams', unit: 'g' },
  ]
  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <ProgressRing
          label={calorieGoal ? `Calorias: ${Math.round(totals.caloriesKcal / calorieGoal * 100)}% da meta` : 'Calorias do dia'}
          progress={calorieGoal ? totals.caloriesKcal / calorieGoal : 0}
          size={120}
          stroke={7}
        >
          <AnimatedNumber format={(value) => formatAmount(value)} style={styles.kcalValue} value={Math.round(totals.caloriesKcal)} />
          <Text style={styles.kcalUnit}>kcal</Text>
        </ProgressRing>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{calorieGoal ? goalDetail(totals.caloriesKcal, calorieGoal) : 'Sem meta de calorias'}</Text>
          <Text style={styles.helper}>{mealCount} refeição(ões) neste dia.</Text>
        </View>
      </View>
      {bars.map(({ label, key, unit }) => {
        const goal = goals[key]
        return (
          <View accessibilityLabel={`${label}: ${formatAmount(totals[key])} ${unit}${goal ? `, ${goalDetail(totals[key], goal)}` : ''}`} key={key} style={styles.macro}>
            <View style={styles.macroTop}>
              <Text style={styles.macroLabel}>{label}</Text>
              <Text style={styles.macroValue}>{formatAmount(totals[key])} {unit}{goal ? ` / ${formatAmount(goal)}` : ''}</Text>
            </View>
            <ProgressBar color={colors.ac} progress={goal ? totals[key] / goal : 0} trackColor={colors.s2} height={4} />
          </View>
        )
      })}
      <Text style={styles.helper}>Metas são definidas por você; o app não faz prescrição nutricional.</Text>
    </View>
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
  const [time, setTime] = useState(() => timeOfDay(initial.consumedAt))
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
    const parsedTime = parseTimeInput(time)
    if (!parsedTime) {
      setError('Informe o horário no formato HH:MM, por exemplo 12:30.')
      return
    }
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
        consumedAt: parsedTime === timeOfDay(meal.consumedAt) ? meal.consumedAt : consumedAtFromTime(meal.localDate, parsedTime),
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
      <Field label="Horário (HH:MM)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} />
      <Field label="Título (opcional)" value={meal.title} onChangeText={(title) => setMeal({ ...meal, title })} />
      <Field label="Observações" value={meal.notes} onChangeText={(notes) => setMeal({ ...meal, notes })} multiline />
      <Text accessibilityRole="header" style={styles.sectionTitle}>Alimentos e valores</Text>
      {meal.items.map((item, index) => (
        <View key={item.id} style={styles.itemCard}>
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
      <Text accessibilityRole="header" style={styles.draftTitle}>Rascunho · revise antes de salvar</Text>
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

function AiKeyRow({ configured, onPress }: { configured: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable
      accessibilityLabel={configured ? 'Gemini: chave configurada. Gerenciar chave' : 'Gemini: sem chave. Configurar chave'}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.settingsToggle}
    >
      <View style={styles.settingsCopy}>
        <Text style={styles.settingsTitle}>Gemini</Text>
        <Text style={styles.helper}>{configured ? 'Chave pessoal salva neste aparelho' : 'Configure uma chave sua para ativar as estimativas e sugestões'}</Text>
      </View>
      <ChevronRight color={colors.mu} size={20} strokeWidth={1.7} />
    </Pressable>
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
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        primary && styles.actionPrimary,
        danger && styles.actionDanger,
        disabled && styles.actionDisabled,
      ]}
    >
      <Text style={[styles.actionText, primary && styles.actionPrimaryText, danger && styles.actionDangerText]}>{label}</Text>
    </PressableScale>
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

let localItemId = 0
/** Itens ainda não salvos recebem ids locais únicos, para que a lista mantenha o estado certo ao remover um do meio. */
function withMealItemIds(item: NutritionMealItemInput, index: number, mealId = 0): NutritionMealItem {
  localItemId += 1
  return { ...item, id: -localItemId, mealId, createdAt: '', updatedAt: '' }
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
  tabs: { marginBottom: 20 },
  sectionTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 8, marginTop: 24 },
  mealsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sheetActions: { gap: 10 },
  summary: { backgroundColor: colors.s1, borderRadius: 20, gap: 14, marginTop: 8, padding: 20 },
  summaryTop: { alignItems: 'center', flexDirection: 'row', gap: 20 },
  summaryCopy: { flex: 1 },
  summaryTitle: { ...typography.body, color: colors.tx },
  kcalValue: { ...typography.numberLarge, color: colors.tx, fontSize: 28, lineHeight: 30 },
  kcalUnit: { ...typography.captionSmall, color: colors.t2 },
  macro: { gap: 6 },
  macroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { ...typography.bodySmall, color: colors.tx },
  macroValue: { ...typography.numberSmall, color: colors.t2 },
  helper: { ...typography.bodySmall, color: colors.t2, marginVertical: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  historyList: { gap: 0 },
  historyRow: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingVertical: 8 },
  historyRowSelected: { backgroundColor: colors.s1 },
  historyDate: { flex: 1 },
  historyDateText: { ...typography.bodySmall, color: colors.tx },
  historyTotals: { alignItems: 'flex-end' },
  historyCalories: { ...typography.numberSmall, color: colors.tx },
  historyMeta: { ...typography.captionSmall, color: colors.t2, marginTop: 2 },
  mealCard: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8, paddingVertical: 16 },
  mealHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  time: { ...typography.numberSmall, color: colors.t2 },
  mealTitle: { ...typography.body, color: colors.tx, fontWeight: '500', marginTop: 8 },
  detail: { ...typography.bodySmall, color: colors.t2, marginVertical: 4 },
  label: { ...typography.captionSmall, color: colors.t2, marginBottom: 4 },
  fieldWrap: { flex: 1, marginBottom: 10, minWidth: 0 },
  input: { ...typography.body, backgroundColor: colors.s1, borderColor: colors.mu, borderRadius: 14, borderWidth: 1, color: colors.tx, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
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
  suggestionCard: { backgroundColor: colors.s1, borderRadius: 20, marginVertical: 12, padding: 12 },
  draftTitle: { ...typography.titleSmall, color: colors.tx, marginBottom: 12 },
  action: { alignItems: 'center', backgroundColor: 'transparent', borderColor: colors.mu, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  actionPrimary: { backgroundColor: colors.ac, borderColor: colors.ac },
  actionDanger: { borderColor: colors.dg },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.76 },
  actionText: { ...typography.labelSmall, color: colors.tx, textAlign: 'center' },
  actionPrimaryText: { color: colors.on },
  actionDangerText: { color: colors.dg },
})

import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseDefinition, TrainingPlan } from '@training/training-domain'

const mocks = vi.hoisted(() => ({ route: { planId: 1, dayId: 1, exerciseDefinitionId: 11, exerciseId: undefined as number | undefined, activityId: undefined as number | undefined }, navigation: { goBack: vi.fn(), navigate: vi.fn() } }))
vi.mock('react-native', () => ({ Alert: { alert: vi.fn() }, FlatList: 'FlatList', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: <T,>(value: T) => value, hairlineWidth: 1 }, Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View' }))
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
vi.mock('@react-navigation/native', () => ({ useNavigation: () => mocks.navigation, useRoute: () => ({ params: mocks.route }) }))
vi.mock('../../../theme', () => ({ shared: { pagePadding: 20 }, useTheme: () => ({ colors: new Proxy({}, { get: () => '#111' }) }) }))
vi.mock('../../../components/Screen', () => ({ Screen: 'Screen', ScreenScrollView: 'ScreenScrollView' }))
vi.mock('../../../components/ScreenHeader', () => ({ ScreenHeader: 'ScreenHeader' }))
vi.mock('../../../components/FormField', () => ({ FormField: 'FormField' }))
vi.mock('../../../components/PrimaryButton', () => ({ PrimaryButton: 'PrimaryButton' }))
vi.mock('../../../components/SelectableChip', () => ({ SelectableChip: 'SelectableChip' }))
vi.mock('../../../components/ThemedTextInput', () => ({ ThemedTextInput: 'ThemedTextInput' }))
vi.mock('../../../components/OptionPicker', () => ({ OptionPickerField: 'OptionPickerField', OptionPickerModal: 'OptionPickerModal' }))
vi.mock('../../../components/ui/BottomSheet', () => ({ BottomSheet: 'BottomSheet' }))
vi.mock('../../../components/ui/SectionHeader', () => ({ SectionHeader: 'SectionHeader' }))
vi.mock('../../../navigation/useUnsavedChangesGuard', () => ({ useUnsavedChangesGuard: () => ({ commit: vi.fn(), dirty: false }) }))

import { DayExerciseEditorScreen } from './DayExerciseEditorScreen'
import { ExercisePicker } from './ExercisePicker'
import { RestActivityEditorScreen } from './RestActivityEditorScreen'
import { TrainingPlanDayScreen } from './TrainingPlanDayScreen'

beforeAll(() => { ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true })
beforeEach(() => { mocks.route = { planId: 1, dayId: 1, exerciseDefinitionId: 11, exerciseId: undefined, activityId: undefined }; mocks.navigation.goBack.mockClear(); mocks.navigation.navigate.mockClear() })

describe('correções do dia da ficha', () => {
  it('separa busy e erros de remoção/reordenação e não duplica a CTA vazia', async () => {
    const props = dayProps()
    const busy = new Set(['exercise:remove:20'])
    const errors = { 'exercise:remove:20': 'Não foi possível remover.', 'day:exercise:reorder:1': 'Não foi possível reorganizar.' }
    const view = await render(TrainingPlanDayScreen, { ...props, busyKeys: busy, errors })
    act(() => view.root.findByType('SectionHeader' as never).props.action.props.onPress())
    expect(view.root.findByProps({ accessibilityLabel: 'Remover Supino' }).props.disabled).toBe(true)
    expect(text(view)).toContain('Não foi possível remover.')
    expect(text(view)).toContain('Não foi possível reorganizar.')
    unmount(view)

    const empty = plan({ exercises: [] })
    const emptyView = await render(TrainingPlanDayScreen, { ...props, plans: [empty] })
    expect(primaryLabels(emptyView).filter((label) => label === 'Adicionar exercício')).toHaveLength(1)
    expect(emptyView.root.findAllByProps({ accessibilityLabel: 'Adicionar exercício' })).toHaveLength(0)
    unmount(emptyView)
  })

  it('mantém a ação de adicionar no fim quando a lista está preenchida e cobre atividade', async () => {
    const activityPlan = plan({ restDay: true, exercises: [], restActivities: [{ id: 30, name: 'Caminhada', category: 'Caminhada', estimatedDurationMinutes: 20, optional: true, description: '', sortOrder: 0 }] })
    mocks.route.dayId = 1
    const view = await render(TrainingPlanDayScreen, { ...dayProps(), plans: [activityPlan], busyKeys: new Set(['activity:remove:30']), errors: { 'activity:remove:30': 'Falha ao remover atividade.' } })
    expect(view.root.findAllByProps({ accessibilityLabel: 'Adicionar atividade' })).toHaveLength(1)
    act(() => view.root.findByType('SectionHeader' as never).props.action.props.onPress())
    expect(view.root.findByProps({ accessibilityLabel: 'Remover Caminhada' }).props.disabled).toBe(true)
    expect(text(view)).toContain('Falha ao remover atividade.')
    unmount(view)
  })
})

describe('editores e catálogo da ficha', () => {
  it('prioriza campos de força, salva enum persistido e preserva alternativa', async () => {
    const onCreate = vi.fn(async () => true)
    const view = await render(DayExerciseEditorScreen, { plans: [plan({ exercises: [] })], library: [exercise(), { ...exercise(), id: 12, name: 'Flexão' }], busyKeys: new Set<string>(), errors: {}, onCreate, onUpdate: vi.fn(async () => true) })
    expect(fieldLabels(view)).toEqual(expect.arrayContaining(['Séries de Supino', 'Repetições mínimas', 'Repetições máximas', 'Carga planejada (kg)', 'Descanso (seg)']))
    expect(fieldLabels(view)).not.toContain('Duração planejada (seg)')
    const typeRow = view.root.findByProps({ accessibilityLabel: 'Tipo de série, Normal' })
    act(() => typeRow.props.onPress())
    const sheet = view.root.findAllByType('BottomSheet' as never).find((node) => node.props.visible)!
    act(() => sheet.findAllByProps({ accessibilityLabel: 'Drop set' })[0]!.props.onPress())
    act(() => view.root.findByProps({ accessibilityLabel: 'Mais opções' }).props.onPress())
    act(() => view.root.findByProps({ accessibilityLabel: 'Exercício alternativo, Nenhum' }).props.onPress())
    const picker = view.root.findByType(ExercisePicker)
    expect(picker.props.excludedId).toBe(11)
    act(() => picker.props.onSelect({ ...exercise(), id: 12, name: 'Flexão' }))
    await act(async () => primary(view, 'Adicionar ao treino').props.onPress())
    expect(onCreate).toHaveBeenCalledWith(1, 1, expect.objectContaining({ exerciseDefinitionId: 11, setType: 'DROP_SET', alternativeExerciseId: 12 }))
    unmount(view)
  })

  it('mostra os campos corretos para cardio e timed', async () => {
    const cardio = await render(DayExerciseEditorScreen, { plans: [plan({ exercises: [] })], library: [{ ...exercise(), category: 'CARDIO', timed: false }], busyKeys: new Set<string>(), errors: {}, onCreate: vi.fn(async () => true), onUpdate: vi.fn(async () => true) })
    expect(fieldLabels(cardio)).toEqual(expect.arrayContaining(['Duração planejada (seg)', 'Distância planejada (km)', 'Descanso (seg)']))
    expect(fieldLabels(cardio)).not.toContain('Carga planejada (kg)')
    unmount(cardio)
    const timed = await render(DayExerciseEditorScreen, { plans: [plan({ exercises: [] })], library: [{ ...exercise(), category: 'MOBILITY', timed: true }], busyKeys: new Set<string>(), errors: {}, onCreate: vi.fn(async () => true), onUpdate: vi.fn(async () => true) })
    expect(fieldLabels(timed)).toContain('Duração planejada (seg)')
    expect(fieldLabels(timed)).not.toContain('Distância planejada (km)')
    unmount(timed)
  })

  it('não salva exercício inválido', async () => {
    const onCreate = vi.fn(async () => true)
    const view = await render(DayExerciseEditorScreen, { plans: [plan({ exercises: [] })], library: [exercise()], busyKeys: new Set<string>(), errors: {}, onCreate, onUpdate: vi.fn(async () => true) })
    act(() => view.root.findAllByType('FormField' as never).find((node) => node.props.label === 'Séries de Supino')!.props.onChangeText('0'))
    await act(async () => primary(view, 'Adicionar ao treino').props.onPress())
    expect(onCreate).not.toHaveBeenCalled()
    expect(text(view)).toContain('Use ao menos uma série')
    unmount(view)
  })

  it('filtra, seleciona uma vez, exclui o exercício atual e deixa favorito opcional', async () => {
    const onSelect = vi.fn(); const view = await render(ExercisePicker, { exercises: [exercise(), { ...exercise(), id: 12, name: 'Remada', favorite: true }], excludedId: 11, onSelect })
    const list = view.root.findByType('FlatList' as never)
    expect(list.props.data.map((item: ExerciseDefinition) => item.id)).toEqual([12])
    act(() => list.props.renderItem({ item: list.props.data[0], index: 0 }).props.children[0].props.onPress())
    act(() => list.props.renderItem({ item: list.props.data[0], index: 0 }).props.children[0].props.onPress())
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(view.root.findAllByType('Pressable' as never).filter((node) => String(node.props.accessibilityLabel).includes('Favoritar'))).toHaveLength(0)
    unmount(view)
  })

  it('salva categoria customizada e mantém checkbox de atividade acessível', async () => {
    const onCreate = vi.fn(async () => true); const view = await render(RestActivityEditorScreen, { plans: [plan({ exercises: [] })], busyKeys: new Set<string>(), errors: {}, onCreate, onUpdate: vi.fn(async () => true) })
    const category = view.root.findByType('OptionPickerField' as never)
    expect(category.props.value).toBe('Recuperação ativa')
    act(() => category.props.onPress())
    const modal = view.root.findByType('OptionPickerModal' as never)
    act(() => modal.props.onConfirm('Yoga restaurativa'))
    expect(view.root.findAllByType('FormField' as never).some((node) => node.props.label === 'Categoria personalizada')).toBe(true)
    act(() => view.root.findAllByType('FormField' as never).find((node) => node.props.label === 'Nome')!.props.onChangeText('Yoga leve'))
    const optional = view.root.findByProps({ accessibilityLabel: 'Atividade opcional' })
    expect(optional.props.accessibilityState.checked).toBe(true)
    act(() => optional.props.onPress())
    await act(async () => primary(view, 'Salvar atividade').props.onPress())
    expect(onCreate).toHaveBeenCalledWith(1, 1, expect.objectContaining({ category: 'Yoga restaurativa', optional: false }))
    unmount(view)
  })

  it('valida nome e expõe erro e busy de atividade', async () => {
    const invalid = await render(RestActivityEditorScreen, { plans: [plan({ exercises: [] })], busyKeys: new Set<string>(), errors: {}, onCreate: vi.fn(async () => true), onUpdate: vi.fn(async () => true) })
    await act(async () => primary(invalid, 'Salvar atividade').props.onPress())
    expect(text(invalid)).toContain('Informe o nome da atividade.')
    unmount(invalid)
    const loading = await render(RestActivityEditorScreen, { plans: [plan({ exercises: [] })], busyKeys: new Set(['day:activity:add:1']), errors: { 'day:activity:add:1': 'Falha ao salvar.' }, onCreate: vi.fn(async () => true), onUpdate: vi.fn(async () => true) })
    expect(primary(loading, 'Salvar atividade').props.loading).toBe(true)
    expect(text(loading)).toContain('Falha ao salvar.')
    unmount(loading)
  })
})

function dayProps() { return { plans: [plan()], busyKeys: new Set<string>(), errors: {}, onUpdateDay: vi.fn(async () => true), onRemoveExercise: vi.fn(async () => true), onReorderExercises: vi.fn(async () => true), onRemoveActivity: vi.fn(async () => true), onReorderActivities: vi.fn(async () => true), onStart: vi.fn(async () => true) } }
function exercise(): ExerciseDefinition { return { id: 11, name: 'Supino', normalizedName: 'supino', description: '', primaryMuscleGroup: 'Peitoral', secondaryMuscleGroups: [], equipment: 'Barra', category: 'STRENGTH', timed: false, source: 'CUSTOM', externalId: null, archived: false, favorite: false, lastUsedAt: null, useCount: 0, media: [] } as unknown as ExerciseDefinition }
function plan(overrides: Record<string, unknown> = {}): TrainingPlan { const day = { id: 1, weekday: 'MONDAY', title: 'Push', description: '', restDay: false, estimatedDurationMinutes: 60, notes: '', sortOrder: 0, exercises: [{ id: 20, exercise: exercise(), sets: 4, minReps: 8, maxReps: 12, plannedLoad: 80, plannedDurationSeconds: null, plannedDistance: null, restSeconds: 90, plannedRpe: null, setType: 'NORMAL', notes: '', alternativeExerciseId: null, sortOrder: 0 }], restActivities: [] }; return { id: 1, name: 'Ficha', description: '', category: '', difficulty: '', startDate: null, endDate: null, active: true, archived: false, deletedAt: null, purgeAt: null, createdAt: '', updatedAt: '', days: [{ ...day, ...overrides }] } as TrainingPlan }
async function render(component: React.ElementType, props: Record<string, unknown>) { let view!: ReactTestRenderer; await act(async () => { view = create(createElement(component as never, props as never)) }); return view }
function unmount(view: ReactTestRenderer) { act(() => view.unmount()) }
function text(view: ReactTestRenderer) { return view.root.findAllByType('Text' as never).flatMap((node) => node.children).join(' ') }
function primary(view: ReactTestRenderer, label: string) { return view.root.findAllByType('PrimaryButton' as never).find((node) => node.props.label === label)! }
function primaryLabels(view: ReactTestRenderer) { return view.root.findAllByType('PrimaryButton' as never).map((node) => node.props.label) }
function fieldLabels(view: ReactTestRenderer) { return view.root.findAllByType('FormField' as never).map((node) => node.props.label) }

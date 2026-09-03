import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrainingPlan } from '@training/training-domain'

const mocks = vi.hoisted(() => ({ navigation: { navigate: vi.fn() }, route: { planId: 1, dayId: 1 } }))
vi.mock('react-native', () => ({ Alert: { alert: vi.fn() }, Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: <T,>(value: T) => value, hairlineWidth: 1 }, Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View' }))
vi.mock('@react-navigation/native', () => ({ useNavigation: () => mocks.navigation, useRoute: () => ({ params: mocks.route }) }))
vi.mock('../../../theme', () => ({ useTheme: () => ({ colors: new Proxy({}, { get: () => '#111111' }) }) }))
vi.mock('../../../components/Screen', () => ({ Screen: 'Screen', ScreenScrollView: 'ScreenScrollView' }))
vi.mock('../../../components/ScreenHeader', () => ({ ScreenHeader: 'ScreenHeader' }))
vi.mock('../../../components/PrimaryButton', () => ({ PrimaryButton: 'PrimaryButton' }))
vi.mock('../../../components/FormField', () => ({ FormField: 'FormField' }))
vi.mock('../../../components/ui/SectionHeader', () => ({ SectionHeader: 'SectionHeader' }))
vi.mock('../../../navigation/useUnsavedChangesGuard', () => ({ useUnsavedChangesGuard: () => ({ dirty: false, commit: vi.fn() }) }))

import { TrainingPlanDayScreen } from './TrainingPlanDayScreen'
import { TrainingPlanView } from './TrainingPlanView'

beforeAll(() => { ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true })
beforeEach(() => { mocks.navigation.navigate.mockClear(); mocks.route.dayId = 1 })

describe('fluxo visual da ficha', () => {
  it('mostra a ficha ativa, semana escaneável e navega sem CTAs de início repetidas', async () => {
    const onSelect = vi.fn()
    const view = await render(TrainingPlanView, { plans: [plan(), { ...plan(), id: 2, name: 'Alternativa', active: false }], selectedPlan: plan(), loading: false, onSelect, onStart: vi.fn(async () => true) })
    expect(view.root.findByType('ScreenHeader' as never).props.title).toBe('Ficha')
    expect(text(view)).toContain('ATIVA')
    expect(text(view)).toContain('Push')
    expect(text(view)).toContain('Descanso')
    expect(text(view)).not.toContain('Iniciar')
    press(view, 'Alternativa')
    expect(onSelect).toHaveBeenCalledWith(2)
    const day = view.root.findAllByType('TouchableOpacity' as never).find((node) => String(node.props.accessibilityLabel).startsWith('SEG,'))
    act(() => day!.props.onPress())
    expect(mocks.navigation.navigate).toHaveBeenCalledWith('TrainingPlanDay', { planId: 1, dayId: 1 })
    act(() => view.root.findByType('ScreenHeader' as never).props.action.props.onPress())
    expect(mocks.navigation.navigate).toHaveBeenCalledWith('TrainingPlanEditor')
    unmount(view)
  })

  it('prioriza exercícios e revela detalhes e reorder apenas por ação explícita', async () => {
    const actions = { onUpdateDay: vi.fn(async () => true), onRemoveExercise: vi.fn(async () => true), onReorderExercises: vi.fn(async () => true), onRemoveActivity: vi.fn(async () => true), onReorderActivities: vi.fn(async () => true), onStart: vi.fn(async () => true) }
    const view = await render(TrainingPlanDayScreen, { plans: [plan()], busyKeys: new Set<string>(), errors: {}, ...actions })
    expect(view.root.findByType('SectionHeader' as never).props.title).toBe('EXERCÍCIOS')
    expect(view.root.findAllByType('FormField' as never)).toHaveLength(0)
    act(() => view.root.findByType('ScreenHeader' as never).props.action.props.onPress())
    expect(view.root.findAllByType('FormField' as never)).toHaveLength(4)
    act(() => view.root.findByType('SectionHeader' as never).props.action.props.onPress())
    expect(view.root.findByProps({ accessibilityLabel: 'Mover Supino para baixo' })).toBeTruthy()
    const start = view.root.findAllByType('PrimaryButton' as never)[0]!
    await act(async () => start.props.onPress())
    expect(actions.onStart).toHaveBeenCalledWith(1, 1)
    unmount(view)
  })

  it('trata descanso como lista de atividades, sem CTA de iniciar treino', async () => {
    mocks.route.dayId = 2
    const view = await render(TrainingPlanDayScreen, { plans: [plan()], busyKeys: new Set<string>(), errors: {}, onUpdateDay: vi.fn(async () => true), onRemoveExercise: vi.fn(async () => true), onReorderExercises: vi.fn(async () => true), onRemoveActivity: vi.fn(async () => true), onReorderActivities: vi.fn(async () => true), onStart: vi.fn(async () => true) })
    expect(text(view)).toContain('Mobilidade')
    expect(view.root.findByType('SectionHeader' as never).props.title).toBe('ATIVIDADES DE RECUPERAÇÃO')
    expect(view.root.findAllByType('PrimaryButton' as never)).toHaveLength(0)
    unmount(view)
  })
})

async function render(component: React.ElementType, props: Record<string, unknown>) { let view!: ReactTestRenderer; await act(async () => { view = create(createElement(component as never, props as never)) }); return view }
function unmount(view: ReactTestRenderer) { act(() => view.unmount()) }
function text(view: ReactTestRenderer) { return view.root.findAllByType('Text' as never).flatMap((node) => node.children).join(' ') }
function press(view: ReactTestRenderer, label: string) { const target = view.root.findAllByType('TouchableOpacity' as never).find((node) => node.findAllByType('Text' as never).flatMap((child) => child.children).join(' ').includes(label)); expect(target, `Ação ${label} não encontrada`).toBeDefined(); act(() => target!.props.onPress()) }

function plan(): TrainingPlan { return { id: 1, name: 'Push / Pull / Legs', description: 'Estrutura semanal', category: 'Hipertrofia', difficulty: 'Intermediário', startDate: null, endDate: null, active: true, archived: false, deletedAt: null, purgeAt: null, createdAt: '', updatedAt: '', days: [{ id: 1, weekday: 'MONDAY', title: 'Push', description: '', restDay: false, estimatedDurationMinutes: 60, notes: '', sortOrder: 0, exercises: [{ id: 10, exercise: { id: 99, name: 'Supino' }, sets: 4, minReps: 8, maxReps: 12, restSeconds: 90, sortOrder: 0 }], restActivities: [] }, { id: 2, weekday: 'SUNDAY', title: '', description: '', restDay: true, estimatedDurationMinutes: 0, notes: '', sortOrder: 1, exercises: [], restActivities: [{ id: 4, name: 'Mobilidade', category: 'Recuperação', estimatedDurationMinutes: 15, sortOrder: 0 }] }] } as unknown as TrainingPlan }

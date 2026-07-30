import { createElement, useState } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TRAINING_PLAN_TEMPLATES,
  type TrainingPlan,
  type TrainingPlanDuplicateMode,
} from '@training/training-domain'

const mocks = vi.hoisted(() => ({
  route: { planId: undefined as number | undefined },
  navigation: { goBack: vi.fn(), dispatch: vi.fn() },
  preventRemove: vi.fn(),
  alert: vi.fn(),
  focus: vi.fn(),
}))

vi.mock('react-native', () => ({
  AccessibilityInfo: { setAccessibilityFocus: mocks.focus },
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: mocks.alert },
  findNodeHandle: () => 1,
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}))
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => mocks.navigation,
  usePreventRemove: mocks.preventRemove,
  useRoute: () => ({ params: mocks.route.planId == null ? undefined : { planId: mocks.route.planId } }),
}))
vi.mock('../../../theme', () => ({
  shared: {
    pagePadding: 20,
    spacing: { sm: 8 },
    touchTarget: { minimum: 48 },
  },
  useTheme: () => ({ colors: {} }),
}))
vi.mock('../../../components/FormField', () => ({ FormField: 'FormField' }))
vi.mock('../../../components/PrimaryButton', () => ({ PrimaryButton: 'PrimaryButton' }))
vi.mock('../../../components/Screen', () => ({ ScreenScrollView: 'ScreenScrollView' }))
vi.mock('../../../components/ScreenHeader', () => ({ ScreenHeader: 'ScreenHeader' }))

import { OptionPickerField, OptionPickerModal } from '../../../components/OptionPicker'
import { TrainingPlanEditorScreen } from './TrainingPlanEditorScreen'
import { TrainingPlanDuplicateModal } from './TrainingPlanDuplicateModal'
import { TrainingPlanTemplateModal } from './TrainingPlanTemplateModal'
import { TrainingPlanWeekPreview } from './TrainingPlanWeekPreview'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0)
    return 1
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = vi.fn()
})

beforeEach(() => {
  mocks.route.planId = undefined
  mocks.navigation.goBack.mockClear()
  mocks.navigation.dispatch.mockClear()
  mocks.preventRemove.mockClear()
  mocks.alert.mockClear()
  mocks.focus.mockClear()
})

describe('editor real de ficha', () => {
  it('cria com template, preserva texto e confirma a troca dos sete dias', async () => {
    const props = editorProps()
    const view = await renderEditor(props)
    expect(view.root.findByType(TrainingPlanTemplateModal).props.visible).toBe(true)

    await act(async () => {
      view.root.findByType(TrainingPlanTemplateModal).props.onUse(TRAINING_PLAN_TEMPLATES[0])
    })
    expect(previewDays(view).find((day) => day.weekday === 'MONDAY')?.title).toBe('Push')

    changeField(view, 'Nome', 'Minha rotina')
    changeField(view, 'Descrição', 'Notas preservadas')
    await act(async () => {
      view.root.findByType(TrainingPlanTemplateModal).props.onUse(TRAINING_PLAN_TEMPLATES[1])
    })
    expect(mocks.alert).toHaveBeenLastCalledWith(
      'Substituir estrutura semanal?',
      'O template substituirá a categoria, a dificuldade e a estrutura semanal atuais.',
      expect.any(Array),
    )
    act(() => alertButtons()[0]!.onPress?.())
    expect(previewDays(view).find((day) => day.weekday === 'MONDAY')?.title).toBe('Push')

    await act(async () => {
      view.root.findByType(TrainingPlanTemplateModal).props.onUse(TRAINING_PLAN_TEMPLATES[1])
    })
    act(() => alertButtons()[1]!.onPress?.())
    expect(field(view, 'Nome').props.value).toBe('Minha rotina')
    expect(field(view, 'Descrição').props.value).toBe('Notas preservadas')
    expect(previewDays(view).find((day) => day.weekday === 'MONDAY')?.title).toBe('Full Body A')
    expect(picker(view, 'Categoria').props.value).toBe('Mista')
    expect(picker(view, 'Dificuldade').props.value).toBe('Iniciante')
    expect(mocks.preventRemove.mock.calls.some(([dirty]) => dirty === true)).toBe(true)

    await pressButton(view, 'Salvar ficha')
    expect(props.onCreate).toHaveBeenCalledTimes(1)
    expect(props.onCreate.mock.calls[0]![0]).toMatchObject({
      plan: {
        name: 'Minha rotina',
        description: 'Notas preservadas',
        category: 'Mista',
        difficulty: 'Iniciante',
      },
      templateId: 'FULL_BODY_3X',
    })
    expect(props.onCreate.mock.calls[0]![0].days).toHaveLength(7)
    view.unmount()
  })

  it('edita somente dados gerais e mostra a estrutura persistida sem templates', async () => {
    const plan = planFixture()
    mocks.route.planId = plan.id
    const props = editorProps([plan])
    const view = await renderEditor(props)
    expect(view.root.findAllByType(TrainingPlanTemplateModal)).toHaveLength(0)
    expect(buttonLabels(view)).not.toContain('Escolher template')
    expect(buttonLabels(view)).not.toContain('Trocar template')
    expect(textContent(view)).toContain('Edite os dias, exercícios e atividades pelas telas da ficha.')
    expect(previewDays(view)).toEqual(plan.days.map((day) => expect.objectContaining({
      weekday: day.weekday,
      title: day.title,
      restDay: day.restDay,
      exercises: day.exercises,
      restActivities: day.restActivities,
    })))

    changeField(view, 'Nome', 'Ficha atualizada')
    await pressButton(view, 'Salvar ficha')
    expect(props.onUpdate).toHaveBeenCalledWith(plan.id, {
      name: 'Ficha atualizada',
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      startDate: plan.startDate,
      endDate: plan.endDate,
    })
    expect(props.onCreate).not.toHaveBeenCalled()
    expect(props.onUpdate.mock.calls[0]![1]).not.toHaveProperty('days')
    view.unmount()
  })

  it('seleciona presets e valor personalizado e mantém erro custom no campo', async () => {
    const view = await renderEditor(editorProps())
    act(() => picker(view, 'Categoria').props.onPress())
    await chooseOption(view, 'Força')
    expect(picker(view, 'Categoria').props.value).toBe('Força')

    act(() => picker(view, 'Dificuldade').props.onPress())
    await chooseOption(view, 'Intermediário')
    expect(picker(view, 'Dificuldade').props.value).toBe('Intermediário')

    act(() => picker(view, 'Categoria').props.onPress())
    act(() => radio(view, 'Outra').props.onPress())
    await act(async () => optionButton(view, 'Confirmar').props.onPress())
    expect(field(view, 'Categoria personalizada').props.error)
      .toBe('Informe categoria personalizada.')

    act(() => field(view, 'Categoria personalizada').props.onChangeText('Calistenia'))
    await act(async () => optionButton(view, 'Confirmar').props.onPress())
    expect(picker(view, 'Categoria').props.value).toBe('Calistenia')
    expect(view.root.findAllByType(OptionPickerModal).every((node) => !node.props.visible)).toBe(true)
    view.unmount()
  })
})

describe('modais reais de template e duplicação', () => {
  it('Voltar retorna à lista de seis templates e restaura o foco acessível', async () => {
    function Harness() {
      const [previewId, setPreviewId] = useState<'PPL_3X' | null>('PPL_3X')
      return (
        <TrainingPlanTemplateModal
          onBack={() => setPreviewId(null)}
          onCancel={() => undefined}
          onPreview={(id) => setPreviewId(id as 'PPL_3X')}
          onUse={() => undefined}
          previewId={previewId}
          visible
        />
      )
    }
    let view!: ReactTestRenderer
    await act(async () => { view = create(<Harness />) })
    expect(button(view, 'Voltar').props.accessibilityLabel)
      .toBe('Voltar para a lista de templates')
    act(() => button(view, 'Voltar').props.onPress())
    expect(view.root.findAllByProps({ accessibilityRole: 'button' })
      .filter((node) => String(node.props.accessibilityLabel).includes(','))).toHaveLength(6)
    expect(mocks.focus).toHaveBeenCalledWith(1)
    view.unmount()
  })

  it('duplica uma vez, bloqueia fechamento durante loading e fecha apenas após success', async () => {
    const pending = deferredResult()
    const confirm = vi.fn(() => pending.promise)
    const success = vi.fn()
    const cancel = vi.fn()
    let view = await renderDuplicate({ confirm, success, cancel })
    for (const mode of ['COMPLETE', 'STRUCTURE_ONLY', 'WITHOUT_LOADS'] as const) {
      act(() => duplicateOption(view, mode).props.onPress())
    }
    expect(view.root.findByType(TrainingPlanDuplicateModal).props.value).toBe('WITHOUT_LOADS')

    const press = button(view, 'Duplicar').props.onPress
    act(() => {
      press()
      press()
      view.root.findByType('Modal' as never).props.onRequestClose()
    })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()

    await act(async () => {
      view.update(duplicateHarness({ confirm, success, cancel, busy: true }))
    })
    expect(button(view, 'Cancelar').props.disabled).toBe(true)
    expect(button(view, 'Duplicar').props.loading).toBe(true)
    act(() => view.root.findByType('Modal' as never).props.onRequestClose())
    expect(cancel).not.toHaveBeenCalled()

    await act(async () => pending.resolve({
      status: 'success',
      refreshWarning: true,
      plan: planFixture(),
    }))
    expect(success).toHaveBeenCalledTimes(1)
    view.unmount()

    const failed = vi.fn(async () => ({ status: 'failed' as const }))
    view = await renderDuplicate({ confirm: failed, success, cancel })
    await act(async () => button(view, 'Duplicar').props.onPress())
    expect(success).toHaveBeenCalledTimes(1)
    expect(view.root.findByType('Modal' as never).props.visible).toBe(true)
    act(() => button(view, 'Cancelar').props.onPress())
    expect(cancel).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})

function editorProps(plans: TrainingPlan[] = []) {
  return {
    plans,
    busyKeys: new Set<string>(),
    errors: {},
    onCreate: vi.fn<Parameters<typeof TrainingPlanEditorScreen>[0]['onCreate']>(async () => ({
      status: 'success' as const,
      refreshWarning: false as const,
      plan: planFixture(2),
    })),
    onUpdate: vi.fn<Parameters<typeof TrainingPlanEditorScreen>[0]['onUpdate']>(async () => true),
    onActivate: vi.fn(async () => true),
    onDuplicate: vi.fn(async () => ({
      status: 'success' as const,
      refreshWarning: false as const,
      plan: planFixture(2),
    })),
    onArchive: vi.fn(async () => true),
    onMoveToTrash: vi.fn(async () => ({ status: 'success' as const, refreshWarning: false })),
  }
}

function alertButtons() {
  return (mocks.alert.mock.lastCall as unknown as [
    string,
    string,
    Array<{ onPress?: () => void }>,
  ])[2]
}

async function renderEditor(props: ReturnType<typeof editorProps>) {
  let view!: ReactTestRenderer
  await act(async () => {
    view = create(createElement(TrainingPlanEditorScreen, props))
  })
  return view
}

function field(view: ReactTestRenderer, label: string) {
  return view.root.findAllByType('FormField' as never).find((node) => node.props.label === label)!
}

function changeField(view: ReactTestRenderer, label: string, value: string) {
  act(() => field(view, label).props.onChangeText(value))
}

function picker(view: ReactTestRenderer, label: string) {
  return view.root.findAllByType(OptionPickerField).find((node) => node.props.label === label)!
}

function radio(view: ReactTestRenderer, label: string) {
  return visibleOptionPicker(view).findAllByProps({ accessibilityRole: 'radio' })
    .find((node) => node.props.accessibilityLabel === label)!
}

async function chooseOption(view: ReactTestRenderer, label: string) {
  act(() => radio(view, label).props.onPress())
  await act(async () => optionButton(view, 'Confirmar').props.onPress())
}

function visibleOptionPicker(view: ReactTestRenderer) {
  return view.root.findAllByType(OptionPickerModal).find((node) => node.props.visible)!
}

function optionButton(view: ReactTestRenderer, label: string) {
  return visibleOptionPicker(view).findAllByType('PrimaryButton' as never)
    .find((node) => node.props.label === label)!
}

function button(view: ReactTestRenderer, label: string) {
  return view.root.findAllByType('PrimaryButton' as never)
    .find((node) => node.props.label === label)!
}

function buttonLabels(view: ReactTestRenderer) {
  return view.root.findAllByType('PrimaryButton' as never).map((node) => node.props.label)
}

async function pressButton(view: ReactTestRenderer, label: string) {
  await act(async () => button(view, label).props.onPress())
}

function previewDays(view: ReactTestRenderer) {
  return view.root.findByType(TrainingPlanWeekPreview).props.days as TrainingPlan['days']
}

function textContent(view: ReactTestRenderer) {
  return view.root.findAllByType('Text' as never)
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === 'string')
    .join(' ')
}

function duplicateHarness({
  confirm,
  success,
  cancel,
  busy = false,
}: {
  confirm: () => ReturnType<typeof deferredResult>['promise'] | Promise<{ status: 'failed' }>
  success: () => void
  cancel: () => void
  busy?: boolean
}) {
  function Harness() {
    const [value, setValue] = useState<TrainingPlanDuplicateMode>('COMPLETE')
    return (
      <TrainingPlanDuplicateModal
        busy={busy}
        onCancel={cancel}
        onChange={setValue}
        onConfirm={confirm}
        onSuccess={success}
        value={value}
        visible
      />
    )
  }
  return <Harness />
}

async function renderDuplicate(props: Parameters<typeof duplicateHarness>[0]) {
  let view!: ReactTestRenderer
  await act(async () => { view = create(duplicateHarness(props)) })
  return view
}

function duplicateOption(view: ReactTestRenderer, mode: TrainingPlanDuplicateMode) {
  return view.root.findAllByProps({ accessibilityRole: 'radio' })
    .find((node) => node.props.children?.[0]?.props?.children?.[1] === ({
      COMPLETE: 'Duplicar completa',
      STRUCTURE_ONLY: 'Apenas estrutura',
      WITHOUT_LOADS: 'Sem cargas planejadas',
    })[mode])!
}

function deferredResult() {
  let resolve!: (value: {
    status: 'success'
    refreshWarning: true
    plan: TrainingPlan
  }) => void
  const promise = new Promise<{
    status: 'success'
    refreshWarning: true
    plan: TrainingPlan
  }>((done) => { resolve = done })
  return { promise, resolve }
}

function planFixture(id = 1): TrainingPlan {
  return {
    id,
    name: 'Ficha persistida',
    description: 'Descrição',
    category: 'Força',
    difficulty: 'Intermediário',
    startDate: null,
    endDate: null,
    active: false,
    archived: false,
    deletedAt: null,
    purgeAt: null,
    days: TRAINING_PLAN_TEMPLATES[0]!.days.map((day, index) => ({
      ...day,
      id: index + 1,
      sortOrder: index,
      exercises: index === 0 ? [{} as TrainingPlan['days'][number]['exercises'][number]] : [],
      restActivities: index === 1 ? [{
        id: 1,
        name: 'Caminhada',
        description: '',
        estimatedDurationMinutes: 10,
        category: 'Recuperação',
        optional: true,
        sortOrder: 0,
      }] : [],
    })),
    createdAt: '2026-07-30T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  }
}

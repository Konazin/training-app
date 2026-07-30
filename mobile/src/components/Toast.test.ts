import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Keyboard: { addListener: () => ({ remove: vi.fn() }) },
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 16, left: 0 }),
}))
vi.mock('../theme', () => ({
  shared: {
    screen: { horizontalPadding: 20 },
    spacing: { lg: 16, md: 12 },
  },
  useTheme: () => ({ colors: {} }),
}))
vi.mock('../theme/typography', () => ({
  typography: { label: { fontSize: 14, lineHeight: 20 } },
}))
vi.mock('../theme/uiContracts', () => ({
  feedbackColors: () => ({ background: '#fff', border: '#000', text: '#111' }),
}))

import { Toast, executeToastAction } from './Toast'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast assíncrono', () => {
  it('fecha ações síncrona e assíncrona com sucesso e chama dismiss uma vez', async () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const sync = vi.fn(() => true)
    const view = await renderToast({ onAction: sync, onDismiss: dismiss })
    await pressAction(view)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(dismiss).toHaveBeenCalledTimes(1)
    expect(findAction(view)).toBeUndefined()

    const pending = deferredValue<boolean>()
    const asyncAction = vi.fn(() => pending.promise)
    await act(async () => {
      view.update(toastElement({ notificationId: 2, onAction: asyncAction, onDismiss: dismiss }))
    })
    const firstPress = findAction(view)!.props.onPress
    act(() => {
      firstPress()
      firstPress()
      vi.advanceTimersByTime(7000)
    })
    expect(asyncAction).toHaveBeenCalledTimes(1)
    expect(findAction(view)?.props.accessibilityState).toMatchObject({ busy: true, disabled: true })
    await act(async () => pending.resolve(true))
    expect(dismiss).toHaveBeenCalledTimes(2)
    view.unmount()
  })

  it('mantém visível quando ação retorna false ou rejeita e trata a rejeição', async () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const view = await renderToast({ onAction: () => false, onDismiss: dismiss })
    await pressAction(view)
    expect(findAction(view)).toBeTruthy()
    expect(dismiss).not.toHaveBeenCalled()
    expect(await executeToastAction(async () => { throw new Error('falha') })).toBe(false)

    await act(async () => {
      view.update(toastElement({
        notificationId: 2,
        onAction: async () => { throw new Error('falha') },
        onDismiss: dismiss,
      }))
    })
    await pressAction(view)
    expect(findAction(view)).toBeTruthy()
    expect(dismiss).not.toHaveBeenCalled()
    view.unmount()
  })

  it('invalida callback antigo e respeita timer, acessibilidade e alvos mínimos', async () => {
    vi.useFakeTimers()
    const oldAction = vi.fn(() => true)
    const nextAction = vi.fn(() => true)
    const dismiss = vi.fn()
    const view = await renderToast({ onAction: oldAction, onDismiss: dismiss })
    const stalePress = findAction(view)!.props.onPress
    await act(async () => {
      view.update(toastElement({
        message: 'Nova mensagem',
        notificationId: 2,
        onAction: nextAction,
        onDismiss: dismiss,
      }))
    })
    await act(async () => stalePress())
    expect(oldAction).not.toHaveBeenCalled()
    const action = findAction(view)!
    expect(action.props.accessibilityRole).toBe('button')
    expect(action.props.style.minHeight).toBeGreaterThanOrEqual(48)
    const container = view.root.findByType('View' as never)
    expect(container.props.style[1].bottom).toBeGreaterThan(76)
    act(() => { vi.advanceTimersByTime(6000) })
    expect(dismiss).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})

function toastElement(overrides: Partial<Parameters<typeof Toast>[0]> = {}) {
  return createElement(Toast, {
    message: 'Ficha movida.',
    notificationId: 1,
    actionLabel: 'Desfazer',
    actionBusyLabel: 'Desfazendo…',
    duration: 6000,
    ...overrides,
  })
}

async function renderToast(overrides: Partial<Parameters<typeof Toast>[0]>) {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(toastElement(overrides))
  })
  return renderer
}

function findAction(view: ReactTestRenderer) {
  return view.root.findAllByType('Pressable' as never)
    .find((node) => node.props.accessibilityLabel !== 'Fechar mensagem')
}

async function pressAction(view: ReactTestRenderer) {
  await act(async () => {
    await findAction(view)!.props.onPress()
  })
}

function deferredValue<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

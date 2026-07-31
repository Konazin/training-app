import { createElement } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  act,
  fireEvent,
  renderAsync,
  screen,
  waitFor,
} from '@testing-library/react-native'
import {
  APP_METADATA_KEYS,
  type AppMetadataRepository,
} from '@training/training-local-db'

jest.mock('@training/training-local-db', () => ({
  APP_METADATA_KEYS: {
    onboardingEligible: 'onboarding.eligible',
    onboardingComplete: 'onboarding.complete',
  },
}))
jest.mock('../../theme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#111111' }) }),
}))
jest.mock('../../theme/typography', () => ({
  typography: { body: {}, caption: {}, label: {}, title: {} },
}))
import { Onboarding } from './Onboarding'
import { useOnboarding } from './useOnboarding'

function Harness({ metadata }: { metadata: AppMetadataRepository }) {
  const onboarding = useOnboarding(metadata)
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={onboarding.reopen}>
        <Text>Conhecer o aplicativo</Text>
      </Pressable>
      <Onboarding
        visible={onboarding.visible}
        onSkip={onboarding.skip}
        onComplete={onboarding.complete}
      />
    </View>
  )
}

const starterPackCalls: string[] = []

function StarterPackHarness() {
  return (
    <Onboarding
      visible
      onSkip={async () => undefined}
      onComplete={async () => { starterPackCalls.push('complete') }}
      onOpenLibrary={() => { starterPackCalls.push('library') }}
      onImportStarterPack={() => { starterPackCalls.push('import') }}
      starterPackEnabled
    />
  )
}

describe('onboarding local', () => {
  it('aparece só em instalação elegível, persiste o pulo e pode ser reaberto', async () => {
    const values = new Map<string, unknown>([
      [APP_METADATA_KEYS.onboardingEligible, true],
      [APP_METADATA_KEYS.onboardingComplete, false],
    ])
    const metadata = repository(values)
    const view = await renderAsync(createElement(Harness, { metadata }))
    await waitFor(() => expect(screen.getByText('Seus treinos ficam no aparelho')).toBeTruthy())
    expect(StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.style).flex).toBeUndefined()
    expect(StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.style).flexShrink).toBe(1)
    fireEvent.press(screen.getByText('Pular'))
    await waitFor(() => expect(screen.queryByText('Seus treinos ficam no aparelho')).toBeNull())
    expect(values.get(APP_METADATA_KEYS.onboardingComplete)).toBe(true)

    fireEvent.press(screen.getByText('Conhecer o aplicativo'))
    expect(screen.getByText('Seus treinos ficam no aparelho')).toBeTruthy()
  })

  it('não força instalações existentes sem marca de elegibilidade e conclui três passos', async () => {
    const values = new Map<string, unknown>()
    await renderAsync(createElement(Harness, { metadata: repository(values) }))
    await waitFor(() => expect(screen.queryByText('Seus treinos ficam no aparelho')).toBeNull())
    fireEvent.press(screen.getByText('Conhecer o aplicativo'))
    fireEvent.press(screen.getByText('Próximo'))
    expect(screen.getByText('Comece pela sua ficha')).toBeTruthy()
    fireEvent.press(screen.getByText('Próximo'))
    expect(screen.getByText('Biblioteca, backup e integrações')).toBeTruthy()
    expect(screen.getByText('Importar pacote recomendado')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByText('Continuar sem exercícios'))
    })
    await waitFor(() => expect(screen.queryByText('Biblioteca, backup e integrações')).toBeNull())
  })

  it('conclui, navega para a Biblioteca e só então abre a importação', async () => {
    starterPackCalls.length = 0
    await renderAsync(createElement(StarterPackHarness))
    fireEvent.press(screen.getByText('Próximo'))
    fireEvent.press(screen.getByText('Próximo'))
    await act(async () => { fireEvent.press(screen.getByText('Importar pacote recomendado')) })
    expect(starterPackCalls).toEqual(['complete', 'library', 'import'])
  })

  it('fecha pelo botão voltar do Android e não atualiza depois do unmount', async () => {
    let resolve!: () => void
    const metadata = repository(new Map([
      [APP_METADATA_KEYS.onboardingEligible, true],
      [APP_METADATA_KEYS.onboardingComplete, false],
    ]))
    metadata.set = jest.fn(() => new Promise<void>((done) => { resolve = done }))
    const view = await renderAsync(createElement(Harness, { metadata }))
    await waitFor(() => expect(screen.getByText('Seus treinos ficam no aparelho')).toBeTruthy())
    await act(async () => {
      view.UNSAFE_getByType(Modal).props.onRequestClose()
      await Promise.resolve()
    })
    await view.unmountAsync()
    resolve()
    await act(async () => { await Promise.resolve() })
    expect(metadata.set).toHaveBeenCalledWith(APP_METADATA_KEYS.onboardingComplete, true)
  })
})

function repository(values: Map<string, unknown>): AppMetadataRepository {
  return {
    get: async (key, validate) => {
      const value = values.get(key)
      return validate(value) ? value : null
    },
    set: async (key, value) => {
      values.set(key, value)
    },
    remove: async (key) => {
      values.delete(key)
    },
  }
}

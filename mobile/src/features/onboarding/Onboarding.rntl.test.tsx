import { createElement } from 'react'
import { Pressable, Text, View } from 'react-native'
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
jest.mock('../../components/Screen', () => {
  const { ScrollView } = require('react-native')
  return { ScreenScrollView: ScrollView }
})

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

describe('onboarding local', () => {
  it('aparece só em instalação elegível, persiste o pulo e pode ser reaberto', async () => {
    const values = new Map<string, unknown>([
      [APP_METADATA_KEYS.onboardingEligible, true],
      [APP_METADATA_KEYS.onboardingComplete, false],
    ])
    const metadata = repository(values)
    await renderAsync(createElement(Harness, { metadata }))
    await waitFor(() => expect(screen.getByText('Seus treinos ficam no aparelho')).toBeTruthy())
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
    await act(async () => {
      fireEvent.press(screen.getByText('Concluir'))
    })
    await waitFor(() => expect(screen.queryByText('Biblioteca, backup e integrações')).toBeNull())
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

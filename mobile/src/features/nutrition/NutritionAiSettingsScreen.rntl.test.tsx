import { createElement } from 'react'
import { fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native'
import type { SecretsRepository } from '@training/training-domain'

jest.mock('../../theme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#111111' }) }),
  shared: { radii: { md: 12 }, control: { primaryHeight: 56, compactHeight: 48 } },
}))
jest.mock('../../components/Screen', () => {
  const React = require('react')
  const { ScrollView } = require('react-native')
  return { ScreenScrollView: ({ children }: { children: React.ReactNode }) => React.createElement(ScrollView, null, children) }
})
jest.mock('../../components/ScreenHeader', () => ({
  ScreenHeader: ({ title }: { title: string }) => {
    const React = require('react')
    const { Text } = require('react-native')
    return React.createElement(Text, null, title)
  },
}))
jest.mock('../../components/FormField', () => ({
  FormField: ({ label, ...props }: { label: string }) => {
    const React = require('react')
    const { TextInput } = require('react-native')
    return React.createElement(TextInput, { accessibilityLabel: label, ...props })
  },
}))
jest.mock('../../components/ui', () => ({
  InlineNotice: ({ message }: { message: string }) => {
    const React = require('react')
    const { Text } = require('react-native')
    return React.createElement(Text, null, message)
  },
}))

jest.mock('../../integrations/secureSecrets', () => ({ GEMINI_API_KEY_SECRET: 'nutrition.gemini.api-key' }))

import { NutritionAiSettingsScreen } from './NutritionAiSettingsScreen'

describe('tela de chave Gemini', () => {
  it('salva a chave no armazenamento seguro e avisa quem depende dela', async () => {
    const secrets: SecretsRepository = { get: async () => null, set: jest.fn(async () => undefined), remove: async () => undefined }
    const onChanged = jest.fn()
    await renderAsync(createElement(NutritionAiSettingsScreen, { secrets, onChanged }))
    await waitFor(() => expect(screen.getByText('Nenhuma chave configurada')).toBeTruthy())
    fireEvent.changeText(screen.getByLabelText('Chave pessoal da Gemini API'), 'AIza-user-test-key')
    fireEvent.press(screen.getByText('Salvar chave neste aparelho'))

    await waitFor(() => expect(secrets.set).toHaveBeenCalledWith('nutrition.gemini.api-key', 'AIza-user-test-key'))
    await waitFor(() => expect(screen.getByText('Chave configurada')).toBeTruthy())
    expect(onChanged).toHaveBeenCalled()
    expect(screen.getByText('Trocar chave')).toBeTruthy()
  })
})

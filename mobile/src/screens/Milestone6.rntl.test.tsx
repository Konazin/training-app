import { createElement } from 'react'
import {
  fireEvent,
  renderAsync,
  screen,
} from '@testing-library/react-native'

const mockNavigation = { navigate: jest.fn() }

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}))
jest.mock('../theme', () => ({
  shared: { touchTarget: { minimum: 48 } },
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#111111' }),
    preferences: { hapticsEnabled: false },
  }),
}))
jest.mock('../theme/typography', () => ({
  typography: { body: {}, bodySmall: {}, caption: {}, labelSmall: {} },
}))
jest.mock('../theme/haptics', () => ({ triggerHaptic: jest.fn() }))
jest.mock('../components/Screen', () => {
  const { ScrollView } = require('react-native')
  return { ScreenScrollView: ScrollView }
})
jest.mock('../components/ScreenHeader', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return { ScreenHeader: ({ title }: { title: string }) => React.createElement(Text, null, title) }
})

import { IntegrationsScreen } from './IntegrationsScreen'
import { MoreScreen } from './MoreScreen'

describe('avisos e provider renderizados', () => {
  beforeEach(() => jest.clearAllMocks())

  it('mostra e dispensa aviso local e reabre a apresentação', async () => {
    const onOnboarding = jest.fn()
    await renderAsync(createElement(MoreScreen, {
      busy: false,
      onIntegrations: jest.fn(),
      onAppearance: jest.fn(),
      onLibrary: jest.fn(),
      onTrash: jest.fn(),
      trashCount: 0,
      onExport: jest.fn(),
      onImport: jest.fn(),
      onErase: jest.fn(),
      automaticBackups: [],
      onRestoreAutomatic: jest.fn(),
      onShareAutomatic: jest.fn(),
      onDeleteAutomatic: jest.fn(),
      onDeleteAllAutomatic: jest.fn(),
      notices: [{ id: 'plan:none', kind: 'NO_ACTIVE_PLAN', message: 'Nenhuma ficha de treino está ativa.' }],
      onOnboarding,
    }))
    expect(screen.getByText('Nenhuma ficha de treino está ativa.')).toBeTruthy()
    fireEvent.press(screen.getByText('Dispensar'))
    expect(screen.queryByText('Nenhuma ficha de treino está ativa.')).toBeNull()
    fireEvent.press(screen.getByText('Conhecer o aplicativo'))
    expect(onOnboarding).toHaveBeenCalledTimes(1)
  })

  it('declara Wger como consulta manual e só navega por ação explícita', async () => {
    await renderAsync(createElement(IntegrationsScreen))
    expect(screen.getByText('Manual · Requer internet · Sem sincronização automática')).toBeTruthy()
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
    fireEvent.press(screen.getByText('Catálogo Wger'))
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WgerIntegration')
  })
})

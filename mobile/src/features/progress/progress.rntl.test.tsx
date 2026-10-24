import { createElement } from 'react'
import { fireEvent, renderAsync, screen } from '@testing-library/react-native'

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ params: { exerciseId: 7 } }),
  NavigationContext: require('react').createContext(null),
  NavigationRouteContext: require('react').createContext(null),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('../../theme', () => ({
  shared: require('../../theme/tokens').shared,
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#111111' }),
    preferences: { hapticsEnabled: false },
  }),
}))
jest.mock('../../components/Screen', () => {
  const { ScrollView, View } = require('react-native')
  return { Screen: View, ScreenScrollView: ScrollView }
})

import { ExerciseProgressScreen } from './ExerciseProgressScreen'
import { PlateCalculatorScreen } from './PlateCalculatorScreen'

const session = {
  id: 1, status: 'COMPLETED', completedAt: '2026-07-01T10:00:00.000Z',
  exercises: [{
    exerciseDefinitionId: 7, substituteExerciseDefinitionId: null,
    sets: [{ completed: true, load: 60, reps: 8 }],
  }],
}

describe('progresso e anilhas', () => {
  it('mostra recordes quando há histórico e estado vazio quando não há', async () => {
    const exercises = [{ id: 7, name: 'Supino' }] as never
    let view = await renderAsync(createElement(ExerciseProgressScreen, { exercises, sessions: [session] as never }))
    expect(screen.getByText('Maior carga')).toBeTruthy()
    expect(screen.getByText('Evolução do 1RM estimado')).toBeTruthy()
    await view.unmountAsync()
    view = await renderAsync(createElement(ExerciseProgressScreen, { exercises, sessions: [] }))
    expect(screen.getByText('Sem histórico ainda')).toBeTruthy()
    await view.unmountAsync()
  })

  it('calcula anilhas por lado', async () => {
    const view = await renderAsync(createElement(PlateCalculatorScreen))
    fireEvent.changeText(screen.getByLabelText('Carga total em quilos'), '100')
    expect(screen.getByText('25 + 15')).toBeTruthy()
    await view.unmountAsync()
  })
})

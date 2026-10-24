import { createElement } from 'react'
import { Text, View } from 'react-native'
import { fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native'
import type { LocalRepositories } from '@training/training-local-db'
import type { NutritionMealInput, SecretsRepository } from '@training/training-domain'

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('../../theme', () => ({
  shared: require('../../theme/tokens').shared,
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#111111' }) }),
}))
jest.mock('../../components/Screen', () => {
  const React = require('react')
  const { ScrollView } = require('react-native')
  return { ScreenScrollView: ({ children }: { children: React.ReactNode }) => React.createElement(ScrollView, null, children) }
})
jest.mock('../../components/ScreenHeader', () => ({
  ScreenHeader: ({ title, description }: { title: string; description?: string }) => {
    const React = require('react')
    const { Text, View } = require('react-native')
    return React.createElement(View, null, React.createElement(Text, null, title), description && React.createElement(Text, null, description))
  },
}))
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
jest.mock('expo-file-system', () => ({ File: jest.fn() }))
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))

import { NutritionScreen } from './NutritionScreen'

describe('nutrição local renderizada', () => {
  it('registra e salva uma refeição manual sem rede', async () => {
    let saved: NutritionMealInput | null = null
    const repositories = createRepositories({
      nutritionMeals: {
        create: jest.fn(async (input: NutritionMealInput) => {
          saved = input
          return { ...input, id: 1, createdAt: '', updatedAt: '', items: input.items.map((item, index) => ({ ...item, id: index + 1, mealId: 1, createdAt: '', updatedAt: '' })) }
        }),
      },
    })
    const secrets: SecretsRepository = { get: async () => null, set: async () => undefined, remove: async () => undefined }
    await renderAsync(createElement(NutritionScreen, { repositories, secrets, onOpenAiSettings: jest.fn() }))

    expect(screen.getByText('Nenhuma refeição registrada neste dia.')).toBeTruthy()
    expect(screen.queryByText(/será adicionada na próxima etapa/i)).toBeNull()
    fireEvent.press(screen.getByText('Adicionar refeição'))
    fireEvent.press(screen.getByText('Adicionar manualmente'))
    await waitFor(() => expect(screen.getByLabelText('Alimento')).toBeTruthy())
    fireEvent.changeText(screen.getByLabelText('Alimento'), 'Aveia')
    fireEvent.changeText(screen.getByLabelText('Porção'), '1 tigela')
    fireEvent.changeText(screen.getAllByLabelText('Calorias (kcal)')[0]!, '120')
    fireEvent.press(screen.getByText('Salvar refeição'))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved).toMatchObject({ source: 'MANUAL', items: [{ name: 'Aveia', caloriesKcal: 120, fiberGrams: 0 }] })
    expect(repositories.nutritionMaintenance.aggregateDay).toHaveBeenCalled()
  })

  it('abre a tela de chave Gemini a partir da Nutrição quando não há chave', async () => {
    const repositories = createRepositories()
    const secrets: SecretsRepository = { get: async () => null, set: async () => undefined, remove: async () => undefined }
    const onOpenAiSettings = jest.fn()
    await renderAsync(createElement(NutritionScreen, { repositories, secrets, onOpenAiSettings }))
    expect(screen.queryByLabelText('Chave pessoal da Gemini API')).toBeNull()
    fireEvent.press(screen.getByText('IA'))
    fireEvent.press(screen.getAllByLabelText('Gemini: sem chave. Configurar chave')[0]!)
    expect(onOpenAiSettings).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getByText('Dia'))
    fireEvent.press(screen.getByText('Adicionar refeição'))
    fireEvent.press(screen.getByText('Câmera · estimar com IA'))
    await waitFor(() => expect(onOpenAiSettings).toHaveBeenCalledTimes(2))
  })

  it('preserva decimais digitados e mostra a confirmação depois de salvar', async () => {
    let saved: NutritionMealInput | null = null
    const repositories = createRepositories({
      nutritionMeals: { create: jest.fn(async (input: NutritionMealInput) => { saved = input; return { ...input, id: 1, createdAt: '', updatedAt: '', items: [] } }) },
    })
    const secrets: SecretsRepository = { get: async () => null, set: async () => undefined, remove: async () => undefined }
    await renderAsync(createElement(NutritionScreen, { repositories, secrets, onOpenAiSettings: jest.fn() }))
    fireEvent.press(screen.getByText('Adicionar refeição'))
    fireEvent.press(screen.getByText('Adicionar manualmente'))
    await waitFor(() => expect(screen.getByLabelText('Alimento')).toBeTruthy())
    fireEvent.changeText(screen.getByLabelText('Alimento'), 'Pão')
    const protein = () => screen.getAllByLabelText('Proteína (g)')[0]!
    fireEvent.changeText(protein(), '1.')
    expect(protein().props.value).toBe('1.')
    fireEvent.changeText(protein(), '1.5')
    fireEvent.changeText(protein(), '')
    expect(protein().props.value).toBe('')
    fireEvent.changeText(protein(), '2,5')
    fireEvent.press(screen.getByText('Salvar refeição'))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved).toMatchObject({ items: [{ proteinGrams: 2.5 }] })
    await waitFor(() => expect(screen.getByText('Refeição salva neste aparelho.')).toBeTruthy())
  })

  it('mantém a confirmação ao salvar metas e não permite avançar além de hoje', async () => {
    const repositories = createRepositories()
    const secrets: SecretsRepository = { get: async () => null, set: async () => undefined, remove: async () => undefined }
    await renderAsync(createElement(NutritionScreen, { repositories, secrets, onOpenAiSettings: jest.fn() }))
    fireEvent.press(screen.getByText('Metas'))
    fireEvent.changeText(screen.getAllByLabelText('Calorias (kcal)')[0]!, '2000')
    fireEvent.press(screen.getByText('Salvar metas'))
    await waitFor(() => expect(screen.getByText('Metas salvas neste aparelho.')).toBeTruthy())
    fireEvent.press(screen.getByText('Dia'))
    expect(screen.getByLabelText('Próximo dia').props.accessibilityState).toMatchObject({ disabled: true })
  })
})

function createRepositories(overrides: Record<string, unknown> = {}) {
  return {
    nutritionMeals: {
      listByDate: jest.fn(async () => []),
      listBetweenDates: jest.fn(async () => []),
      create: jest.fn(async (input: NutritionMealInput) => ({ ...input, id: 1, createdAt: '', updatedAt: '', items: [] })),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      ...((overrides.nutritionMeals ?? {}) as object),
    },
    nutritionSummaries: { findByDate: jest.fn(async () => null), listBetweenDates: jest.fn(async () => []), upsert: jest.fn() },
    nutritionMaintenance: { aggregateDay: jest.fn(async () => null), closePendingDays: jest.fn(), purgeExpiredMealDetails: jest.fn(), run: jest.fn() },
    settings: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), remove: jest.fn() },
  } as unknown as LocalRepositories
}

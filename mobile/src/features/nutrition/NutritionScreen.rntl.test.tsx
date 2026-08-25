import { createElement } from 'react'
import { fireEvent, renderAsync, screen } from '@testing-library/react-native'
import { localDateKey, type DailyNutritionSummary, type NutritionMeal } from '@training/training-domain'

jest.mock('../../components/Screen', () => {
  const { ScrollView } = require('react-native')
  return { ScreenScrollView: ScrollView }
})
jest.mock('../../components/ScreenHeader', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return { ScreenHeader: ({ title }: { title: string }) => React.createElement(Text, null, title) }
})
jest.mock('../../components/ui', () => {
  const React = require('react')
  const { Pressable, Text, View } = require('react-native')
  return {
    BottomActionBar: View,
    EmptyState: ({ title, description, action }: { title: string; description: string; action?: unknown }) => React.createElement(View, null, React.createElement(Text, null, title), React.createElement(Text, null, description), action),
    InlineNotice: ({ message, action }: { message: string; action?: unknown }) => React.createElement(View, null, React.createElement(Text, null, message), action),
    SectionHeader: ({ title }: { title: string }) => React.createElement(Text, null, title),
    StatusPill: ({ label }: { label: string }) => React.createElement(Text, null, label),
    Pressable,
  }
})
jest.mock('../../theme', () => ({
  shared: { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxxl: 40 }, radii: { sm: 8, md: 12, lg: 16 }, touchTarget: { minimum: 44 } },
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000000' }) }),
}))
jest.mock('../../theme/typography', () => ({ typography: new Proxy({}, { get: () => ({}) }) }))

import { NutritionScreen } from './NutritionScreen'

const today = localDateKey(new Date())
const meal: NutritionMeal = {
  id: 1, localDate: today, consumedAt: `${today}T12:00:00.000Z`, mealType: 'LUNCH', title: 'Almoço', notes: '', source: 'MANUAL', createdAt: '', updatedAt: '',
  items: [{ id: 1, mealId: 1, name: 'Arroz', portionDescription: '', estimatedGrams: null, caloriesKcal: 120, proteinGrams: 2, carbohydratesGrams: 25, fatGrams: 0, fiberGrams: 1, micronutrients: {}, confidence: null, dataSource: 'MANUAL', sortOrder: 0, createdAt: '', updatedAt: '' }],
}

describe('NutritionScreen', () => {
  it('oferece o formulário manual, metas e entradas de imagem indisponíveis sem permissões', async () => {
    const onConfigureGoals = jest.fn()
    await renderAsync(createElement(NutritionScreen, { repositories: repositories([meal], null), onConfigureGoals }))
    expect(screen.getAllByText('Almoço')).not.toHaveLength(0)
    fireEvent.press(screen.getByLabelText('Câmera'))
    expect(screen.getByText(/análise por imagem será adicionada/)).toBeTruthy()
    fireEvent.press(screen.getByText('Configurar metas'))
    expect(onConfigureGoals).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getAllByText('Registrar refeição')[0]!)
    expect(screen.getByText('Nova refeição')).toBeTruthy()
  })

  it('mostra os totais permanentes e bloqueia alterações depois do expurgo', async () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const purgedDate = localDateKey(yesterday)
    const summary: DailyNutritionSummary = { id: 1, localDate: purgedDate, totalCaloriesKcal: 321, totalProteinGrams: 10, totalCarbohydratesGrams: 20, totalFatGrams: 5, totalFiberGrams: 4, totalMicronutrients: {}, mealCount: 1, itemCount: 1, goalCaloriesKcal: null, goalProteinGrams: null, goalCarbohydratesGrams: null, goalFatGrams: null, goalFiberGrams: null, closedAt: '', finalized: true, detailsPurgedAt: new Date().toISOString(), updatedAt: '' }
    await renderAsync(createElement(NutritionScreen, { repositories: repositories([], summary), onConfigureGoals: jest.fn() }))
    fireEvent.press(screen.getByLabelText('Dia anterior'))
    expect((await screen.findAllByText('Detalhes removidos')).length).toBeGreaterThan(0)
    expect(screen.getByText('321 kcal')).toBeTruthy()
    expect(screen.queryByText('Registrar refeição')).toBeNull()
  })
})

function repositories(meals: NutritionMeal[], summary: DailyNutritionSummary | null) {
  return {
    nutritionMeals: { listByDate: jest.fn(async () => meals), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    nutritionSummaries: { findByDate: jest.fn(async () => summary) },
    settings: { get: jest.fn(async () => null) },
  } as never
}

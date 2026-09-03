import { createElement } from 'react'
import { act, create } from 'react-test-renderer'

const mockController = {
  query: { page: 1, pageSize: 50, language: 'auto', text: '', onlyWithImage: false, onlyWithVideo: false },
  items: Array.from({ length: 50 }, (_, id) => ({
    provider: id % 2 ? 'WGER' : 'EXERCISEDB', externalId: String(id), name: `Exercício ${id}`,
    description: '', primaryMuscleGroup: 'Peito', secondaryMuscleGroups: [], equipment: 'Nenhum',
    category: 'STRENGTH', difficulty: 'Iniciante', instructions: '', unilateral: false, timed: false,
    sourceUrl: '', licenseName: null, licenseUrl: null, author: null, media: [], warnings: [], language: 'pt-br', original: {},
  })),
  selected: new Map(), existing: new Set(), preview: null, phase: 'results', message: { text: '', kind: 'info' },
  total: 100, hasNext: true, hasPrevious: false, importedCount: 0, languages: [], languagesLoading: false, languagesFailed: false,
  setQuery: jest.fn(), search: jest.fn(), toggle: jest.fn(), selectPage: jest.fn(), clearSelection: jest.fn(), setPreview: jest.fn(),
  savePreview: jest.fn(), importSelected: jest.fn(), refreshImported: jest.fn(), loadLanguages: jest.fn(),
}

jest.mock('./useWgerIntegrationController', () => ({ useWgerIntegrationController: () => mockController }))
jest.mock('../../theme', () => ({
  shared: { screen: { horizontalPadding: 16 } },
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000000' }) }),
}))
jest.mock('../../theme/typography', () => ({ typography: { body: {}, bodySmall: {}, caption: {}, label: {}, titleSmall: {}, title: {} } }))
jest.mock('../../components/Screen', () => ({ Screen: ({ children }: { children: unknown }) => children }))
jest.mock('../../components/ScreenHeader', () => ({ ScreenHeader: () => null }))
jest.mock('../../components/PrimaryButton', () => ({ PrimaryButton: () => null }))
jest.mock('../../components/SelectableChip', () => ({ SelectableChip: () => null }))
jest.mock('../../components/ThemedTextInput', () => ({ ThemedTextInput: () => null }))
jest.mock('../../components/FormField', () => ({ FormField: () => null }))
jest.mock('../../components/Toast', () => ({ Toast: () => null }))

import { FlatList, Text } from 'react-native'
import { WgerIntegrationScreen } from './WgerIntegrationScreen'

describe('barra fixa do catálogo', () => {
  it('mantém controles inferiores estruturais com pageSize 50', () => {
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(createElement(WgerIntegrationScreen, {
        imports: {} as never,
        exercises: {} as never,
        onImported: jest.fn(async () => {}),
        providerId: 'WGER',
      }))
    })
    const list = renderer.root.find((node) => node.type === FlatList && node.props.data.length === 50)
    expect(list.props.style).toEqual(expect.objectContaining({ flex: 1, minHeight: 120 }))
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Importar selecionados')).toBe(true)
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Anterior')).toBe(true)
    expect(renderer.root.findAllByType(Text).some((node) => node.props.children === 'Próxima')).toBe(true)
    expect(renderer.root.findAllByType(Text).some((node) => node.props.accessibilityLabel === 'Página 1')).toBe(true)
    act(() => renderer.unmount())
  })
})

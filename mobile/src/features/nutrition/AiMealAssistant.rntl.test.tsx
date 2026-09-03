import { createElement } from 'react'
import { act, fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native'
import { EMPTY_USER_PROFILE } from '@training/training-domain'

const mockAnalyze = jest.fn()
jest.mock('../ai/AiGatewayClient', () => ({
  AI_PRIVACY_NOTICE: 'Free Tier',
  AiGatewayClient: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn(async () => ({ available: true })),
    analyzeMealImage: mockAnalyze,
    parseMeal: jest.fn(),
  })),
}))
jest.mock('../../components/ui', () => {
  const React = require('react'); const { Pressable, Text, View } = require('react-native')
  return { InlineNotice: ({ message }: { message: string }) => React.createElement(Text, null, message), SectionHeader: ({ title }: { title: string }) => React.createElement(Text, null, title), Pressable, View }
})
jest.mock('../../theme', () => ({ useTheme: () => ({ colors: { primary: '#111', textPrimary: '#111', textSecondary: '#777', border: '#ddd', surfaceSecondary: '#eee' } }) }))

import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { AiMealAssistant } from './AiMealAssistant'

const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock

describe('AiMealAssistant photo flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAnalyze.mockResolvedValue({ items: [], uncertainties: [] })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://camera.jpg', width: 4000, height: 3000, mimeType: 'image/jpeg', base64: 'aGVsbG8=' }] })
  })

  it('shows the processed preview and keeps it after an error for retry', async () => {
    mockAnalyze.mockRejectedValueOnce(new Error('A análise da imagem demorou mais do que o esperado.'))
    const onReview = jest.fn()
    await renderAsync(createElement(AiMealAssistant, { action: 'image', date: '2026-09-03', repositories: repositories(), onReview }))
    fireEvent.press(screen.getByText('Galeria'))
    await waitFor(() => expect(screen.getByLabelText('Imagem selecionada para análise')).toBeTruthy())
    expect(mockManipulate).toHaveBeenCalledWith('file://camera.jpg', [{ resize: { width: 1600, height: 1200 } }], expect.objectContaining({ compress: 0.78, base64: true, format: 'jpeg' }))
    fireEvent.changeText(screen.getByLabelText('Informações adicionais (opcional)'), 'o frango tem 200g')
    fireEvent.press(screen.getByText('Analisar com IA'))
    await waitFor(() => expect(screen.getByText('A análise da imagem demorou mais do que o esperado.')).toBeTruthy())
    expect(screen.getByLabelText('Imagem selecionada para análise')).toBeTruthy()
    fireEvent.press(screen.getByText('Tentar novamente'))
    await waitFor(() => expect(onReview).toHaveBeenCalledTimes(1))
    expect(mockAnalyze).toHaveBeenCalledTimes(2)
    expect(mockAnalyze).toHaveBeenLastCalledWith(expect.objectContaining({ image: expect.objectContaining({ userHint: 'o frango tem 200g' }) }))
  })

  it('does not submit twice while analysis is running', async () => {
    let resolve: (() => void) | undefined
    mockAnalyze.mockImplementation(() => new Promise((done) => { resolve = () => done({ items: [], uncertainties: [] }) }))
    await renderAsync(createElement(AiMealAssistant, { action: 'image', date: '2026-09-03', repositories: repositories(), onReview: jest.fn() }))
    fireEvent.press(screen.getByText('Galeria'))
    await waitFor(() => expect(screen.getByLabelText('Imagem selecionada para análise')).toBeTruthy())
    fireEvent.press(screen.getByText('Analisar com IA'))
    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1))
    fireEvent.press(screen.getByText('Analisando…'))
    expect(mockAnalyze).toHaveBeenCalledTimes(1)
    await act(async () => resolve?.())
  })
})

function repositories() {
  return { settings: { get: jest.fn(async (key: string) => key === 'ai.enabled'), set: jest.fn() }, userProfile: { get: jest.fn(async () => EMPTY_USER_PROFILE) } } as never
}

import { createElement } from 'react'
import { fireEvent, renderAsync, screen, waitFor } from '@testing-library/react-native'
import { EMPTY_USER_PROFILE } from '@training/training-domain'

jest.mock('../components/ScreenHeader', () => ({ ScreenHeader: ({ title }: { title: string }) => { const { Text } = require('react-native'); return <Text>{title}</Text> } }))
jest.mock('../components/ui', () => {
  const React = require('react'); const { Text, View } = require('react-native')
  return { InlineNotice: ({ message }: { message: string }) => React.createElement(Text, null, message), SectionHeader: ({ title }: { title: string }) => React.createElement(Text, null, title), View }
})
jest.mock('../theme', () => ({ useTheme: () => ({ colors: { primary: '#111', onPrimary: '#fff', textPrimary: '#111', textSecondary: '#777', border: '#ddd', surfaceSecondary: '#eee', danger: '#f00' } }) }))

import { UserProfileScreen } from './UserProfileScreen'

describe('UserProfileScreen weekdays', () => {
  it('edits multiple weekdays as chips and saves a stable array', async () => {
    let stored = EMPTY_USER_PROFILE
    const repository = { get: jest.fn(async () => stored), save: jest.fn(async (next) => { stored = next; return next }) }
    const view = await renderAsync(createElement(UserProfileScreen, { repositories: { userProfile: repository } as never }))
    fireEvent.press(screen.getByLabelText('Seg'))
    fireEvent.press(screen.getByLabelText('Seg'))
    expect(screen.getByLabelText('Seg').props.accessibilityState).toMatchObject({ selected: false })
    fireEvent.press(screen.getByLabelText('Seg'))
    fireEvent.press(screen.getByLabelText('Qui'))
    expect(screen.getByLabelText('Seg').props.accessibilityState).toMatchObject({ selected: true })
    fireEvent.changeText(screen.getByLabelText('Preferências (separe por vírgula)'), 'arroz, frango ')
    expect(screen.getByLabelText('Preferências (separe por vírgula)').props.value).toBe('arroz, frango ')
    fireEvent.press(screen.getByText('Salvar perfil'))
    await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(1))
    expect(stored.trainingDays).toEqual(['MONDAY', 'THURSDAY'])
    expect(stored.foodPreferences).toEqual(['arroz', 'frango'])
    await view.unmountAsync()
    await renderAsync(createElement(UserProfileScreen, { repositories: { userProfile: repository } as never }))
    expect(screen.getByLabelText('Seg').props.accessibilityState).toMatchObject({ selected: true })
    expect(screen.getByLabelText('Qui').props.accessibilityState).toMatchObject({ selected: true })
  })
})

import { createElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  fireEvent,
  renderAsync,
  screen,
  waitFor,
} from '@testing-library/react-native'
import type { BackupRepository } from '@training/training-domain'
import type { AppMetadataRepository } from '@training/training-local-db'

const mockRetryPreferences = jest.fn(async () => true)
const mockAutomatic = {
  create: jest.fn(async () => ({
    uri: 'file:///safety.json',
    fileName: 'safety.json',
    createdAt: '2026-07-30T12:00:00.000Z',
    sizeBytes: 10,
    reason: 'BEFORE_IMPORT',
  })),
  delete: jest.fn(),
  deleteAll: jest.fn(),
  list: jest.fn(async () => []),
  restore: jest.fn(),
  share: jest.fn(),
}
const mockPickBackup = jest.fn(async () => ({ schemaVersion: 2 }))

jest.mock('../integrations/automaticBackupService', () => ({
  createAutomaticBackupService: () => mockAutomatic,
}))
jest.mock('../integrations/backupFiles', () => ({
  pickBackup: () => mockPickBackup(),
  shareBackup: jest.fn(),
}))

import { useBackupController } from './useBackupController'

function Harness({
  repository,
  onChanged,
}: {
  repository: BackupRepository
  onChanged: () => Promise<{ success: boolean; failedParts: string[] }>
}) {
  const backup = useBackupController(
    repository,
    {} as AppMetadataRepository,
    '0.8.1',
    onChanged,
  )
  return (
    <View>
      <Text>{backup.message}</Text>
      <Pressable accessibilityRole="button" onPress={() => void backup.importBackup()}>
        <Text>Restaurar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void backup.retryRefresh()}>
        <Text>Tentar novamente</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void backup.exportBackup()}>
        <Text>Exportar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={backup.dismissRetry}>
        <Text>Dispensar retry</Text>
      </Pressable>
    </View>
  )
}

describe('restauração pós-commit renderizada', () => {
  beforeEach(() => jest.clearAllMocks())

  it('mostra aviso e repete apenas preferências e refresh', async () => {
    const repository = {
      export: jest.fn(),
      reset: jest.fn(),
      restore: jest.fn(async () => ({
        postCommitWarning: 'O backup foi restaurado, mas as preferências visuais não puderam ser aplicadas.',
        retryPostCommit: mockRetryPreferences,
      })),
    } as unknown as BackupRepository
    const onChanged = jest.fn(async () => ({ success: true, failedParts: [] }))
    await renderAsync(createElement(Harness, { repository, onChanged }))

    fireEvent.press(screen.getByText('Restaurar'))
    await waitFor(() => {
      expect(screen.getByText(
        'O backup foi restaurado, mas as preferências visuais não puderam ser aplicadas.',
      )).toBeTruthy()
    })
    expect(repository.restore).toHaveBeenCalledTimes(1)

    fireEvent.press(screen.getByText('Tentar novamente'))
    await waitFor(() => {
      expect(screen.getByText('Preferências e informações atualizadas.')).toBeTruthy()
    })
    expect(mockRetryPreferences).toHaveBeenCalledTimes(1)
    expect(repository.restore).toHaveBeenCalledTimes(1)
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it('preserva retry pendente após uma ação diferente concluída', async () => {
    const repository = {
      export: jest.fn(),
      reset: jest.fn(),
      restore: jest.fn(async () => ({
        postCommitWarning: 'Preferências pendentes.',
        retryPostCommit: mockRetryPreferences,
      })),
    } as unknown as BackupRepository
    await renderAsync(createElement(Harness, {
      repository,
      onChanged: jest.fn(async () => ({ success: true, failedParts: [] })),
    }))

    fireEvent.press(screen.getByText('Restaurar'))
    await waitFor(() => expect(screen.getByText('Preferências pendentes.')).toBeTruthy())
    fireEvent.press(screen.getByText('Exportar'))
    await waitFor(() => expect(screen.getByText('Backup exportado.')).toBeTruthy())
    fireEvent.press(screen.getByText('Tentar novamente'))
    await waitFor(() => expect(screen.getByText('Preferências e informações atualizadas.')).toBeTruthy())
    expect(mockRetryPreferences).toHaveBeenCalledTimes(1)
  })

  it('remove o retry somente após dispensa explícita', async () => {
    const repository = {
      export: jest.fn(),
      reset: jest.fn(),
      restore: jest.fn(async () => ({
        postCommitWarning: 'Preferências pendentes.',
        retryPostCommit: mockRetryPreferences,
      })),
    } as unknown as BackupRepository
    await renderAsync(createElement(Harness, {
      repository,
      onChanged: jest.fn(async () => ({ success: true, failedParts: [] })),
    }))
    fireEvent.press(screen.getByText('Restaurar'))
    await waitFor(() => expect(screen.getByText('Preferências pendentes.')).toBeTruthy())
    fireEvent.press(screen.getByText('Dispensar retry'))
    fireEvent.press(screen.getByText('Tentar novamente'))
    await waitFor(() => expect(screen.getByText('Informações atualizadas.')).toBeTruthy())
    expect(mockRetryPreferences).not.toHaveBeenCalled()
  })
})

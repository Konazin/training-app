import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AutomaticBackupInfo,
  AutomaticBackupReason,
  BackupRepository,
} from '@training/training-domain'
import type { AppMetadataRepository } from '@training/training-local-db'
import { pickBackup, shareBackup } from '../integrations/backupFiles'
import { createAutomaticBackupService } from '../integrations/automaticBackupService'
import type { RefreshAllResult } from './refreshAll'

export function useBackupController(
  repository: BackupRepository,
  metadata: AppMetadataRepository,
  appVersion: string,
  recreateSeed: () => Promise<void>,
  onChanged: () => Promise<RefreshAllResult>,
) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'warning' | 'error'>('success')
  const [refreshPending, setRefreshPending] = useState(false)
  const [automaticBackups, setAutomaticBackups] = useState<AutomaticBackupInfo[]>([])
  const automatic = useMemo(
    () => createAutomaticBackupService(repository, metadata, appVersion),
    [appVersion, metadata, repository],
  )
  const refreshBackups = useCallback(async () => {
    setAutomaticBackups(await automatic.list())
  }, [automatic])
  useEffect(() => {
    void refreshBackups()
  }, [refreshBackups])

  const run = useCallback(async (operation: () => Promise<string | void>) => {
    if (busy) return false
    setBusy(true)
    setMessage('')
    try {
      const result = await operation()
      await refreshBackups()
      if (result) {
        setMessageKind('success')
        setMessage(result)
      }
      return true
    } catch (cause) {
      setMessageKind('error')
      setMessage(cause instanceof Error ? cause.message : 'Falha na operação local.')
      return false
    } finally {
      setBusy(false)
    }
  }, [busy, refreshBackups])

  const refreshChanged = useCallback(async (
    successMessage: string,
    warningMessage: string,
  ) => {
    const result = await onChanged()
    setRefreshPending(!result.success)
    setMessageKind(result.success ? 'success' : 'warning')
    setMessage(result.success ? successMessage : warningMessage)
    return result.success
  }, [onChanged])

  const runCommitted = useCallback(async (
    mutation: () => Promise<boolean | void>,
    successMessage: string,
    warningMessage: string,
  ) => {
    if (busy) return false
    setBusy(true)
    setMessage('')
    let committed = true
    try {
      committed = await mutation() !== false
    } catch (cause) {
      setMessageKind('error')
      setMessage(cause instanceof Error ? cause.message : 'Falha na operação local.')
      return false
    } finally {
      setBusy(false)
    }
    if (!committed) return false
    await refreshBackups()
    await refreshChanged(successMessage, warningMessage)
    return true
  }, [busy, refreshBackups, refreshChanged])

  return {
    busy,
    message,
    messageKind,
    refreshPending,
    automaticBackups,
    createAutomaticBackup: async (reason: AutomaticBackupReason) => {
      const result = await automatic.create(reason)
      await refreshBackups()
      return result
    },
    exportBackup: () => run(async () => {
      await shareBackup(repository, appVersion)
      return 'Backup exportado.'
    }),
    retryRefresh: () => refreshChanged(
      'Telas atualizadas.',
      'Algumas telas ainda não puderam ser atualizadas.',
    ),
    importBackup: () => runCommitted(async () => {
      const selected = await pickBackup()
      if (!selected) return false
      await automatic.create('BEFORE_IMPORT')
      await repository.restore(selected)
    }, 'Backup restaurado com sucesso.',
    'Backup restaurado, mas algumas telas não puderam ser atualizadas.'),
    eraseAll: () => runCommitted(async () => {
      const backup = await automatic.create('BEFORE_ERASE')
      await repository.reset()
      setMessage(`Backup de segurança criado em ${formatDate(backup.createdAt)}.`)
    }, 'Todos os dados foram apagados.',
    'Os dados foram apagados, mas algumas telas não puderam ser atualizadas.'),
    resetSeed: () => runCommitted(async () => {
      const backup = await automatic.create('BEFORE_RESET_SEED')
      await recreateSeed()
      setMessage(`Backup de segurança criado em ${formatDate(backup.createdAt)}.`)
    }, 'Dados iniciais recriados.',
    'Os dados foram recriados, mas algumas telas não puderam ser atualizadas.'),
    restoreAutomatic: (uri: string) => runCommitted(async () => {
      await automatic.create('BEFORE_IMPORT')
      await automatic.restore(uri)
    }, 'Backup automático restaurado com sucesso.',
    'Backup automático restaurado, mas algumas telas não puderam ser atualizadas.'),
    shareAutomatic: (uri: string) => run(() => automatic.share(uri)),
    deleteAutomatic: (uri: string) => run(() => automatic.delete(uri)),
    deleteAllAutomatic: () => run(() => automatic.deleteAll()),
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

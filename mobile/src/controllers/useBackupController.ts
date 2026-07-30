import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AutomaticBackupInfo, BackupRepository } from '@training/training-domain'
import type { AppMetadataRepository } from '@training/training-local-db'
import { pickBackup, shareBackup } from '../integrations/backupFiles'
import { createAutomaticBackupService } from '../integrations/automaticBackupService'

export function useBackupController(
  repository: BackupRepository,
  metadata: AppMetadataRepository,
  appVersion: string,
  recreateSeed: () => Promise<void>,
  onChanged: () => Promise<void>,
) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success')
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

  return {
    busy,
    message,
    messageKind,
    automaticBackups,
    exportBackup: () => run(async () => {
      await shareBackup(repository, appVersion)
      return 'Backup exportado.'
    }),
    importBackup: () => run(async () => {
      const selected = await pickBackup()
      if (!selected) return
      await automatic.create('BEFORE_IMPORT')
      await repository.restore(selected)
      await onChanged()
      return 'Backup restaurado com sucesso.'
    }),
    eraseAll: () => run(async () => {
      const backup = await automatic.create('BEFORE_ERASE')
      await repository.reset()
      await onChanged()
      return `Todos os dados foram apagados. Backup de segurança criado em ${formatDate(backup.createdAt)}.`
    }),
    resetSeed: () => run(async () => {
      const backup = await automatic.create('BEFORE_RESET_SEED')
      await recreateSeed()
      await onChanged()
      return `Dados iniciais recriados. Backup de segurança criado em ${formatDate(backup.createdAt)}.`
    }),
    restoreAutomatic: (uri: string) => run(async () => {
      await automatic.create('BEFORE_IMPORT')
      await automatic.restore(uri)
      await onChanged()
      return 'Backup automático restaurado com sucesso.'
    }),
    shareAutomatic: (uri: string) => run(() => automatic.share(uri)),
    deleteAutomatic: (uri: string) => run(() => automatic.delete(uri)),
    deleteAllAutomatic: () => run(() => automatic.deleteAll()),
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

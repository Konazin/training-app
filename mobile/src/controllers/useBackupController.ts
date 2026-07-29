import { useCallback, useState } from 'react'
import type { BackupRepository } from '@training/training-domain'
import { exportBackupFile, pickBackup, shareBackup } from '../integrations/backupFiles'

export function useBackupController(
  repository: BackupRepository,
  appVersion: string,
  recreateSeed: () => Promise<void>,
  onChanged: () => Promise<void>,
) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const run = useCallback(async (operation: () => Promise<string | void>) => {
    if (busy) return false
    setBusy(true)
    setMessage('')
    try {
      const result = await operation()
      if (result) setMessage(result)
      return true
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Falha na operação local.')
      return false
    } finally {
      setBusy(false)
    }
  }, [busy])

  return {
    busy,
    message,
    exportBackup: () => run(async () => {
      await shareBackup(repository, appVersion)
      return 'Backup exportado.'
    }),
    importBackup: () => run(async () => {
      const selected = await pickBackup()
      if (!selected) return
      await exportBackupFile(repository, appVersion, true)
      await repository.restore(selected)
      await onChanged()
      return 'Backup restaurado com sucesso.'
    }),
    eraseAll: () => run(async () => {
      await exportBackupFile(repository, appVersion, true)
      await repository.reset()
      await onChanged()
      return 'Todos os dados foram apagados.'
    }),
    resetSeed: () => run(async () => {
      await exportBackupFile(repository, appVersion, true)
      await recreateSeed()
      await onChanged()
      return 'Dados iniciais recriados.'
    }),
  }
}

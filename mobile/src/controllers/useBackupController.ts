import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AutomaticBackupInfo,
  AutomaticBackupReason,
  BackupRepository,
  BackupRestoreResult,
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
  const busyRef = useRef(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'warning' | 'error'>('success')
  const [refreshPending, setRefreshPending] = useState(false)
  const postCommitRetry = useRef<BackupRestoreResult['retryPostCommit'] | null>(null)
  const [automaticBackups, setAutomaticBackups] = useState<AutomaticBackupInfo[]>([])
  const automatic = useMemo(
    () => createAutomaticBackupService(repository, metadata, appVersion),
    [appVersion, metadata, repository],
  )
  const refreshBackups = useCallback(async () => {
    setAutomaticBackups(await automatic.list())
  }, [automatic])
  useEffect(() => {
    void refreshBackups().catch(() => {
      setRefreshPending(true)
      setMessageKind('warning')
      setMessage('A lista de backups não pôde ser atualizada.')
    })
  }, [refreshBackups])

  const run = useCallback(async (operation: () => Promise<string | void>) => {
    if (busyRef.current) return false
    busyRef.current = true
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
      busyRef.current = false
      setBusy(false)
    }
  }, [refreshBackups])

  const refreshCommitted = useCallback(async () => {
    const failedParts: string[] = []
    try {
      await refreshBackups()
    } catch {
      failedParts.push('lista de backups')
    }
    try {
      const result = await onChanged()
      if (!result.success) failedParts.push(...(result.failedParts.length ? result.failedParts : ['telas']))
    } catch {
      failedParts.push('telas')
    }
    return [...new Set(failedParts)]
  }, [onChanged, refreshBackups])

  const runCommitted = useCallback(async (
    mutation: () => Promise<false | void | BackupRestoreResult | { success: string; warning: string }>,
    successMessage: string,
    warningMessage: string,
  ) => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setMessage('')
    try {
      let result: false | void | BackupRestoreResult | { success: string; warning: string }
      try {
        result = await mutation()
      } catch (cause) {
        setMessageKind('error')
        setMessage(cause instanceof Error ? cause.message : 'Falha na operação local.')
        return false
      }
      if (result === false) return false
      const restoreWarning = result && 'postCommitWarning' in result ? result : null
      postCommitRetry.current = restoreWarning?.retryPostCommit ?? null
      const failedParts = await refreshCommitted()
      const hasWarning = Boolean(restoreWarning) || failedParts.length > 0
      setRefreshPending(hasWarning)
      setMessageKind(hasWarning ? 'warning' : 'success')
      const operationMessage = restoreWarning?.postCommitWarning
        ?? (result && 'warning' in result ? result.warning : warningMessage)
      const success = result && 'success' in result ? result.success : successMessage
      setMessage(hasWarning
        ? `${operationMessage}${failedParts.length ? ` Não atualizadas: ${failedParts.join(', ')}.` : ''}`
        : success)
      return true
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [refreshCommitted])

  const retryRefresh = useCallback(async () => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    try {
      const retry = postCommitRetry.current
      let preferenceApplied = true
      if (retry) {
        try {
          preferenceApplied = await retry()
        } catch {
          preferenceApplied = false
        }
        if (preferenceApplied) postCommitRetry.current = null
      }
      const failedParts = await refreshCommitted()
      const success = preferenceApplied && failedParts.length === 0
      setRefreshPending(!success)
      setMessageKind(success ? 'success' : 'warning')
      setMessage(success
        ? retry ? 'Preferências e informações atualizadas.' : 'Informações atualizadas.'
        : [
          !preferenceApplied
            ? 'As preferências visuais ainda não puderam ser aplicadas.'
            : '',
          failedParts.length
            ? `Não atualizadas: ${failedParts.join(', ')}.`
            : '',
          'Tente novamente.',
        ].filter(Boolean).join(' '))
      return success
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [refreshCommitted])

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
    retryRefresh,
    importBackup: () => runCommitted(async () => {
      const selected = await pickBackup()
      if (!selected) return false
      await automatic.create('BEFORE_IMPORT')
      return repository.restore(selected)
    }, 'Backup restaurado com sucesso.',
    'Backup restaurado, mas algumas informações não puderam ser atualizadas.'),
    eraseAll: () => runCommitted(async () => {
      const backup = await automatic.create('BEFORE_ERASE')
      await repository.reset()
      const date = formatDate(backup.createdAt)
      return {
        success: `Todos os dados foram apagados. Backup de segurança criado em ${date}.`,
        warning: `Todos os dados foram apagados e o backup de segurança foi criado em ${date}, mas algumas informações não puderam ser atualizadas.`,
      }
    }, 'Todos os dados foram apagados.',
    'Todos os dados foram apagados, mas algumas informações não puderam ser atualizadas.'),
    resetSeed: () => runCommitted(async () => {
      const backup = await automatic.create('BEFORE_RESET_SEED')
      await recreateSeed()
      const date = formatDate(backup.createdAt)
      return {
        success: `Dados iniciais recriados. Backup de segurança criado em ${date}.`,
        warning: `Os dados iniciais foram recriados e o backup de segurança foi criado em ${date}, mas algumas informações não puderam ser atualizadas.`,
      }
    }, 'Dados iniciais recriados.',
    'Os dados foram recriados, mas algumas informações não puderam ser atualizadas.'),
    restoreAutomatic: (uri: string) => runCommitted(async () => {
      await automatic.create('BEFORE_IMPORT')
      return automatic.restore(uri)
    }, 'Backup automático restaurado com sucesso.',
    'Backup automático restaurado, mas algumas informações não puderam ser atualizadas.'),
    shareAutomatic: (uri: string) => run(() => automatic.share(uri)),
    deleteAutomatic: (uri: string) => run(() => automatic.delete(uri)),
    deleteAllAutomatic: () => run(() => automatic.deleteAll()),
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

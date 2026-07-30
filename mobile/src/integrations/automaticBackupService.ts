import { File } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import {
  type AutomaticBackupInfo,
  type AutomaticBackupReason,
  type BackupRepository,
  type TrainingBackup,
} from '@training/training-domain'
import {
  APP_METADATA_KEYS,
  BACKUP_LIMITS,
  type AppMetadataRepository,
} from '@training/training-local-db'
import { exportBackupFile } from './backupFiles'

const isBackupList = (value: unknown): value is AutomaticBackupInfo[] =>
  Array.isArray(value) && value.every((item) =>
    item != null
    && typeof item === 'object'
    && typeof (item as AutomaticBackupInfo).uri === 'string'
    && typeof (item as AutomaticBackupInfo).fileName === 'string'
    && typeof (item as AutomaticBackupInfo).createdAt === 'string'
    && typeof (item as AutomaticBackupInfo).sizeBytes === 'number'
    && ['BEFORE_IMPORT', 'BEFORE_ERASE', 'BEFORE_RESET_SEED', 'BEFORE_EMPTY_TRASH']
      .includes((item as AutomaticBackupInfo).reason),
  )

export function createAutomaticBackupService(
  repository: BackupRepository,
  metadata: AppMetadataRepository,
  appVersion: string,
) {
  const saveList = (items: AutomaticBackupInfo[]) =>
    metadata.set(APP_METADATA_KEYS.automaticBackups, items)

  const list = async () => {
    const saved = await metadata.get(APP_METADATA_KEYS.automaticBackups, isBackupList) ?? []
    const existing = saved.filter((item) => new File(item.uri).exists)
    if (existing.length !== saved.length) await saveList(existing)
    return existing.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  return {
    list,
    async create(reason: AutomaticBackupReason) {
      const file = await exportBackupFile(repository, appVersion, true)
      const info: AutomaticBackupInfo = {
        uri: file.uri,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        sizeBytes: file.size ?? 0,
        reason,
      }
      const backups = [info, ...await list()]
      for (const expired of backups.slice(5)) {
        const expiredFile = new File(expired.uri)
        if (expiredFile.exists) expiredFile.delete()
      }
      await saveList(backups.slice(0, 5))
      return info
    },
    async restore(uri: string) {
      const file = new File(uri)
      if (!file.exists) throw new Error('O backup automático não existe mais.')
      if ((file.size ?? 0) > BACKUP_LIMITS.fileBytes) throw new Error('O backup excede o limite de 25 MB.')
      let backup: TrainingBackup
      try {
        backup = JSON.parse(await file.text()) as TrainingBackup
      } catch {
        throw new Error('O backup automático não contém JSON válido.')
      }
      return repository.restore(backup)
    },
    async share(uri: string) {
      if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento não disponível neste aparelho.')
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Compartilhar backup automático',
        mimeType: 'application/json',
      })
    },
    async delete(uri: string) {
      const file = new File(uri)
      if (file.exists) file.delete()
      await saveList((await list()).filter((item) => item.uri !== uri))
    },
    async deleteAll() {
      for (const item of await list()) {
        const file = new File(item.uri)
        if (file.exists) file.delete()
      }
      await saveList([])
    },
  }
}

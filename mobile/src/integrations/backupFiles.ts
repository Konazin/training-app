import { File, Paths } from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import * as Sharing from 'expo-sharing'
import type { BackupRepository, TrainingBackup } from '@training/training-domain'

export async function exportBackupFile(
  repository: BackupRepository,
  appVersion: string,
  automatic = false,
) {
  const backup = await repository.export(appVersion)
  const timestamp = backup.exportedAt.replace(/[:.]/g, '-')
  const file = new File(
    automatic ? Paths.document : Paths.cache,
    `training-${automatic ? 'auto-' : ''}backup-${timestamp}.json`,
  )
  await file.write(JSON.stringify(backup, null, 2))
  return file
}

export async function shareBackup(repository: BackupRepository, appVersion: string) {
  const file = await exportBackupFile(repository, appVersion)
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento não disponível neste aparelho.')
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Exportar backup do Training',
    mimeType: 'application/json',
  })
  return file.uri
}

export async function pickBackup(): Promise<TrainingBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  })
  if (result.canceled) return null
  const text = await new File(result.assets[0]!.uri).text()
  try {
    return JSON.parse(text) as TrainingBackup
  } catch {
    throw new Error('O arquivo selecionado não contém JSON válido.')
  }
}

export async function exportDiagnostic(message: string) {
  const file = new File(Paths.cache, `training-diagnostic-${Date.now()}.txt`)
  await file.write([
    'Training App — diagnóstico local',
    new Date().toISOString(),
    message,
  ].join('\n'))
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Exportar diagnóstico' })
  }
}

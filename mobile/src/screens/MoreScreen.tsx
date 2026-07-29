import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import { shared, type ThemeColors, useTheme } from '../theme'
import type { AutomaticBackupInfo } from '@training/training-domain'

export function MoreScreen({
  busy,
  message,
  onLibrary,
  onExport,
  onImport,
  onErase,
  onResetSeed,
  automaticBackups,
  onRestoreAutomatic,
  onShareAutomatic,
  onDeleteAutomatic,
  onDeleteAllAutomatic,
}: {
  busy: boolean
  message: string
  onLibrary: () => void
  onExport: () => void
  onImport: () => void
  onErase: () => void
  onResetSeed: () => void
  automaticBackups: AutomaticBackupInfo[]
  onRestoreAutomatic: (uri: string) => void
  onShareAutomatic: (uri: string) => void
  onDeleteAutomatic: (uri: string) => void
  onDeleteAllAutomatic: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const confirmErase = () => Alert.alert(
    'Apagar todos os dados?',
    'Um backup automático será criado antes. Esta ação remove fichas, exercícios e histórico deste aparelho.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: onErase },
    ],
  )
  const confirmSeed = () => Alert.alert(
    'Recriar dados iniciais?',
    'Os dados atuais serão substituídos pelo catálogo e pela ficha demonstrativa.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Recriar', style: 'destructive', onPress: onResetSeed },
    ],
  )
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Local e privado"
        title="Mais"
        description="Backup e dados do aparelho. Nenhuma destas ações usa servidor."
      />
      {!!message && <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View>}
      <Text style={styles.section}>CONTEÚDO</Text>
      <MenuItem label="Biblioteca de exercícios" detail="Criar e editar" onPress={onLibrary} disabled={busy} />
      <Text style={styles.section}>BACKUP</Text>
      <MenuItem label="Exportar backup" detail="training-backup-v1.json" onPress={onExport} disabled={busy} />
      <MenuItem label="Importar backup" detail="Validar e restaurar" onPress={onImport} disabled={busy} />
      <Text style={styles.section}>BACKUPS AUTOMÁTICOS</Text>
      {!automaticBackups.length && <Text style={styles.note}>Nenhum backup automático criado.</Text>}
      {automaticBackups.map((backup) => (
        <View key={backup.uri} style={styles.backup}>
          <Text style={styles.label}>{reasonLabel(backup.reason)}</Text>
          <Text style={styles.detail}>
            {new Date(backup.createdAt).toLocaleString()} · {formatBytes(backup.sizeBytes)}
          </Text>
          <View style={styles.actions}>
            <SmallAction label="Restaurar" disabled={busy} onPress={() => Alert.alert(
              'Restaurar este backup?',
              'Um novo backup de segurança será criado antes da restauração.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Restaurar', onPress: () => onRestoreAutomatic(backup.uri) },
              ],
            )} />
            <SmallAction label="Compartilhar" disabled={busy} onPress={() => onShareAutomatic(backup.uri)} />
            <SmallAction label="Excluir" disabled={busy} danger onPress={() => Alert.alert(
              'Excluir backup?',
              'O arquivo deixará de estar disponível para restauração.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => onDeleteAutomatic(backup.uri) },
              ],
            )} />
          </View>
        </View>
      ))}
      {!!automaticBackups.length && (
        <MenuItem
          label="Excluir backups automáticos"
          detail="Remove todos os arquivos de segurança"
          onPress={() => Alert.alert(
            'Excluir todos os backups?',
            'Esta ação não altera os treinos atuais.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: onDeleteAllAutomatic },
            ],
          )}
          disabled={busy}
          danger
        />
      )}
      <Text style={styles.section}>MANUTENÇÃO</Text>
      <MenuItem label="Apagar todos os dados" detail="Exige confirmação" onPress={confirmErase} disabled={busy} danger />
      <MenuItem label="Recriar dados iniciais" detail="Catálogo e ficha demo" onPress={confirmSeed} disabled={busy} danger />
      <Text style={styles.note}>
        Os dados principais ficam no SQLite. Ao desinstalar o aplicativo, eles são apagados; exporte backups regularmente.
      </Text>
    </ScrollView>
  )
}

function SmallAction({ label, disabled, danger, onPress }: {
  label: string
  disabled: boolean
  danger?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={styles.smallAction}>
      <Text style={[styles.smallActionText, danger && styles.danger]}>{label}</Text>
    </TouchableOpacity>
  )
}

function reasonLabel(reason: AutomaticBackupInfo['reason']) {
  return {
    BEFORE_IMPORT: 'Antes de restaurar',
    BEFORE_ERASE: 'Antes de apagar',
    BEFORE_RESET_SEED: 'Antes de recriar dados iniciais',
  }[reason]
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function MenuItem({
  label,
  detail,
  onPress,
  disabled,
  danger,
}: {
  label: string
  detail: string
  onPress: () => void
  disabled: boolean
  danger?: boolean
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <TouchableOpacity disabled={disabled} style={[styles.item, disabled && styles.disabled]} onPress={onPress}>
      <View>
        <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: shared.pagePadding, paddingBottom: 110 },
  section: { color: colors.gray400, fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  item: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 17, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minHeight: 64, paddingHorizontal: 16 },
  disabled: { opacity: 0.55 },
  label: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  detail: { color: colors.gray500, fontSize: 8, marginTop: 4 },
  danger: { color: colors.danger },
  arrow: { color: colors.gray500, fontSize: 17 },
  message: { backgroundColor: colors.nearBlack, borderRadius: 14, marginBottom: 8, padding: 13 },
  messageText: { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  note: { color: colors.gray500, fontSize: 9, lineHeight: 15, marginTop: 18 },
  backup: { backgroundColor: colors.card, borderColor: colors.gray200, borderRadius: 17, borderWidth: 1, marginBottom: 8, padding: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  smallAction: { borderColor: colors.gray200, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  smallActionText: { color: colors.ink, fontSize: 8, fontWeight: '800' },
})

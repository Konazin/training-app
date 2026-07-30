import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { ScreenScrollView } from '../components/Screen'
import { ScreenHeader } from '../components/ScreenHeader'
import { SelectableChip } from '../components/SelectableChip'
import { shared, type ThemeColors, type ThemePreference, useTheme } from '../theme'
import { typography } from '../theme/typography'
import type { AutomaticBackupInfo } from '@training/training-domain'
import {
  trashBadgeAccessibilityLabel,
  trashBadgeText,
} from '../features/training-plan/model/trainingPlan'

export function MoreScreen({
  busy,
  onIntegrations,
  onLibrary,
  onTrash,
  trashCount,
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
  onIntegrations: () => void
  onLibrary: () => void
  onTrash: () => void
  trashCount: number
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
  const { colors, preference, setPreference } = useTheme()
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
    <ScreenScrollView includeBottomInset={false}>
      <ScreenHeader
        eyebrow="Local e privado"
        title="Mais"
        description="Backup e dados do aparelho. Nenhuma destas ações usa servidor."
      />
      <Text style={styles.section}>APARÊNCIA</Text>
      <View style={styles.themeOptions}>
        {([
          ['system', 'Sistema'],
          ['light', 'Claro'],
          ['dark', 'Escuro'],
        ] as [ThemePreference, string][]).map(([value, label]) => (
          <SelectableChip key={value} label={label} selected={preference === value} onPress={() => setPreference(value)} />
        ))}
      </View>
      <Text style={styles.section}>CONTEÚDO</Text>
      <MenuItem label="Biblioteca de exercícios" detail="Criar e editar" onPress={onLibrary} disabled={busy} />
      <MenuItem
        label="Lixeira de fichas"
        detail="Restaurar ou excluir definitivamente"
        onPress={onTrash}
        disabled={busy}
        badge={trashCount}
        accessibilityLabel={trashBadgeAccessibilityLabel(trashCount)}
      />
      <Text style={styles.section}>INTEGRAÇÕES</Text>
      <MenuItem
        label="Catálogo Wger"
        detail="Busca exercícios públicos e salva uma cópia no aparelho."
        onPress={onIntegrations}
        disabled={busy}
      />
      <Text style={styles.section}>BACKUP</Text>
      <MenuItem label="Exportar backup" detail="Schema 2 · arquivo identificado por data" onPress={onExport} disabled={busy} />
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
    </ScreenScrollView>
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
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
      <Text style={[styles.smallActionText, danger && styles.danger]}>{label}</Text>
    </Pressable>
  )
}

function reasonLabel(reason: AutomaticBackupInfo['reason']) {
  return {
    BEFORE_IMPORT: 'Antes de restaurar',
    BEFORE_ERASE: 'Antes de apagar',
    BEFORE_RESET_SEED: 'Antes de recriar dados iniciais',
    BEFORE_EMPTY_TRASH: 'Antes de esvaziar a lixeira',
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
  badge,
  accessibilityLabel,
}: {
  label: string
  detail: string
  onPress: () => void
  disabled: boolean
  danger?: boolean
  badge?: number
  accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={({ pressed }) => [styles.item, disabled && styles.disabled, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.itemCopy}>
        <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <View style={styles.trailing}>
        {!!trashBadgeText(badge ?? 0) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{trashBadgeText(badge ?? 0)}</Text>
          </View>
        )}
        <Text style={styles.arrow}>→</Text>
      </View>
    </Pressable>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginTop: 20 },
  themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minHeight: 68, paddingHorizontal: 16, paddingVertical: 10 },
  itemCopy: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.55 },
  label: { ...typography.body, color: colors.textPrimary, flexShrink: 1, fontWeight: '800' },
  detail: { ...typography.caption, color: colors.textSecondary, flexShrink: 1, marginTop: 4 },
  danger: { color: colors.danger },
  arrow: { color: colors.gray500, fontSize: 17 },
  trailing: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  badge: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, justifyContent: 'center', minHeight: 24, minWidth: 24, paddingHorizontal: 7 },
  badgeText: { color: colors.onPrimary, fontSize: 12, fontWeight: '900' },
  note: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 18 },
  backup: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, marginBottom: 8, padding: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  smallAction: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: shared.touchTarget.minimum, paddingHorizontal: 12 },
  smallActionText: { ...typography.labelSmall, color: colors.textPrimary, fontWeight: '800' },
  pressed: { opacity: 0.72 },
})

import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { Archive, BookOpen, Calculator, ChevronRight, Download, FileSpreadsheet, Globe, Lightbulb, Palette, Trash2, Upload } from 'lucide-react-native'
import { ScreenScrollView } from '../components/Screen'
import { PressableScale, Reveal } from '../motion'
import { ScreenHeader } from '../components/ScreenHeader'
import { shared, type ThemeColors, useTheme } from '../theme'
import { triggerHaptic } from '../theme/haptics'
import { typography } from '../theme/typography'
import type { AutomaticBackupInfo, LocalNotice } from '@training/training-domain'
import {
  trashBadgeAccessibilityLabel,
  trashBadgeText,
} from '../features/training-plan/model/trainingPlan'

export function MoreScreen({
  busy,
  onIntegrations,
  onAppearance,
  onLibrary,
  onPlateCalculator,
  onExportCsv,
  onTrash,
  trashCount,
  onExport,
  onImport,
  onErase,
  automaticBackups,
  onRestoreAutomatic,
  onShareAutomatic,
  onDeleteAutomatic,
  onDeleteAllAutomatic,
  notices,
  onOnboarding,
}: {
  busy: boolean
  onIntegrations: () => void
  onAppearance: () => void
  onLibrary: () => void
  onPlateCalculator: () => void
  onExportCsv: () => void
  onTrash: () => void
  trashCount: number
  onExport: () => void
  onImport: () => void
  onErase: () => void | Promise<void>
  automaticBackups: AutomaticBackupInfo[]
  onRestoreAutomatic: (uri: string) => void
  onShareAutomatic: (uri: string) => void
  onDeleteAutomatic: (uri: string) => void
  onDeleteAllAutomatic: () => void
  notices: LocalNotice[]
  onOnboarding: () => void
}) {
  const { colors, preferences } = useTheme()
  const styles = createStyles(colors)
  const [dismissedNotices, setDismissedNotices] = useState<Set<string>>(new Set())
  const visibleNotices = notices.filter((notice) => !dismissedNotices.has(notice.id))
  const confirmErase = () => Alert.alert(
    'Apagar todos os dados?',
    'Um backup automático será criado antes. Esta ação remove fichas, exercícios, sessões, nutrição e a chave de IA deste aparelho.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar tudo',
        style: 'destructive',
        onPress: () => {
          void triggerHaptic('DESTRUCTIVE_CONFIRM', preferences.hapticsEnabled)
          void onErase()
        },
      },
    ],
  )
  return (
    <ScreenScrollView includeBottomInset={false}>
      <Reveal>
        <ScreenHeader
          title="Mais"
          description="Backups e dados guardados neste aparelho. Catálogos externos são opcionais."
        />
      </Reveal>
      {!!visibleNotices.length && <Text accessibilityRole="header" style={styles.section}>Avisos</Text>}
      {visibleNotices.map((notice) => (
        <View accessibilityLiveRegion="polite" key={notice.id} style={styles.notice}>
          <Text style={styles.noticeText}>{notice.message}</Text>
          <SmallAction
            label="Dispensar"
            disabled={false}
            onPress={() => setDismissedNotices((current) => new Set(current).add(notice.id))}
          />
        </View>
      ))}
      <Text accessibilityRole="header" style={styles.section}>Aparência</Text>
      <MenuItem
        icon={<Palette color={colors.tx} size={20} strokeWidth={1.5} />}
        label="Aparência e acessibilidade"
        detail="Tema, movimento, contraste e feedback tátil"
        onPress={onAppearance}
        disabled={busy}
      />
      <MenuItem
        icon={<Lightbulb color={colors.tx} size={20} strokeWidth={1.5} />}
        label="Conhecer o aplicativo"
        detail="Reabrir a apresentação inicial"
        onPress={onOnboarding}
        disabled={busy}
      />
      <Text accessibilityRole="header" style={styles.section}>Conteúdo</Text>
      <MenuItem icon={<BookOpen color={colors.tx} size={20} strokeWidth={1.5} />} label="Biblioteca de exercícios" detail="Criar e editar" onPress={onLibrary} disabled={busy} />
      <MenuItem icon={<Calculator color={colors.tx} size={20} strokeWidth={1.5} />} label="Calculadora de anilhas" detail="Anilhas por lado para a carga total" onPress={onPlateCalculator} disabled={busy} />
      <MenuItem
        icon={<Trash2 color={colors.tx} size={20} strokeWidth={1.5} />}
        label="Lixeira de fichas"
        detail="Restaurar ou excluir definitivamente"
        onPress={onTrash}
        disabled={busy}
        badge={trashCount}
        accessibilityLabel={trashBadgeAccessibilityLabel(trashCount)}
      />
      <Text accessibilityRole="header" style={styles.section}>Integrações</Text>
      <MenuItem
        icon={<Globe color={colors.tx} size={20} strokeWidth={1.5} />}
        label="Fontes de exercícios"
        detail="Catálogos externos opcionais e cópias salvas no aparelho."
        onPress={onIntegrations}
        disabled={busy}
      />
      <Text accessibilityRole="header" style={styles.section}>Backup</Text>
      <MenuItem icon={<Download color={colors.tx} size={20} strokeWidth={1.5} />} label="Exportar backup" detail="Schema 3 · arquivo identificado por data" onPress={onExport} disabled={busy} />
      <MenuItem icon={<Upload color={colors.tx} size={20} strokeWidth={1.5} />} label="Importar backup" detail="Validar e restaurar" onPress={onImport} disabled={busy} />
      <MenuItem icon={<FileSpreadsheet color={colors.tx} size={20} strokeWidth={1.5} />} label="Exportar histórico (CSV)" detail="Séries, cargas e repetições para planilha" onPress={onExportCsv} disabled={busy} />
      <Text accessibilityRole="header" style={styles.section}>Backups automáticos</Text>
      {!automaticBackups.length && <Text style={styles.note}>Nenhum backup automático criado.</Text>}
      {automaticBackups.map((backup) => (
        <View key={backup.uri} style={styles.backup}>
          <Archive color={colors.t2} size={18} strokeWidth={1.5} />
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
          icon={<Archive color={colors.dg} size={20} strokeWidth={1.5} />}
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
      <Text accessibilityRole="header" style={styles.section}>Manutenção</Text>
      <MenuItem icon={<Trash2 color={colors.dg} size={20} strokeWidth={1.5} />} label="Apagar todos os dados" detail="Exige confirmação" onPress={confirmErase} disabled={busy} danger />
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
    <PressableScale accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.smallAction}>
      <Text style={[styles.smallActionText, danger && styles.danger]}>{label}</Text>
    </PressableScale>
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
  icon,
  label,
  detail,
  onPress,
  disabled,
  danger,
  badge,
  accessibilityLabel,
}: {
  icon?: ReactNode
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
    <PressableScale accessibilityLabel={accessibilityLabel} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} pressedScale={0.99} style={[styles.item, disabled && styles.disabled]} onPress={onPress}>
      {icon && <View style={styles.icon}>{icon}</View>}
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
        <ChevronRight color={colors.mu} size={18} strokeWidth={1.5} />
      </View>
    </PressableScale>
  )
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { ...typography.caption, color: colors.t2, marginBottom: 4, marginTop: 32 },
  item: { alignItems: 'center', borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 64, paddingVertical: 8 },
  icon: { alignItems: 'center', justifyContent: 'center', width: 24 },
  itemCopy: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.5 },
  label: { ...typography.body, color: colors.tx, flexShrink: 1 },
  detail: { ...typography.caption, color: colors.t2, flexShrink: 1, marginTop: 2 },
  danger: { color: colors.dg },
  trailing: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  badge: { alignItems: 'center', backgroundColor: colors.ac, borderRadius: 12, justifyContent: 'center', minHeight: 24, minWidth: 24, paddingHorizontal: 7 },
  badgeText: { color: colors.on, ...typography.captionSmall },
  note: { ...typography.bodySmall, color: colors.t2, marginTop: 18 },
  notice: { backgroundColor: colors.s1, borderRadius: shared.radii.md, gap: 10, marginBottom: 8, padding: 16 },
  noticeText: { ...typography.bodySmall, color: colors.tx },
  backup: { borderBottomColor: colors.bd, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8, marginBottom: 8, paddingVertical: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallAction: { alignItems: 'center', borderColor: colors.mu, borderRadius: shared.radii.md, borderWidth: 1, justifyContent: 'center', minHeight: shared.touchTarget.minimum, paddingHorizontal: 12 },
  smallActionText: { ...typography.labelSmall, color: colors.tx },
  pressed: { opacity: 0.72 },
})

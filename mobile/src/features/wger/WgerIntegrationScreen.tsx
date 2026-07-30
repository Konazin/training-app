import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type {
  ExerciseCategory,
  ExerciseLibraryRepository,
  ExternalExerciseCandidate,
  ExternalExerciseImportRepository,
} from '@training/training-domain'
import { FormField } from '../../components/FormField'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ScreenScrollView } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SelectableChip } from '../../components/SelectableChip'
import { ThemedTextInput } from '../../components/ThemedTextInput'
import { Toast } from '../../components/Toast'
import { shared, type ThemeColors, useTheme } from '../../theme'
import { typography } from '../../theme/typography'
import { useWgerIntegrationController } from './useWgerIntegrationController'

export function WgerIntegrationScreen({
  imports,
  exercises,
  onImported,
}: {
  imports: ExternalExerciseImportRepository
  exercises: ExerciseLibraryRepository
  onImported: () => Promise<unknown>
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const controller = useWgerIntegrationController(imports, exercises, onImported)
  const busy = controller.phase === 'loading' || controller.phase === 'importing'
  const [consented, setConsented] = useState(false)
  return (
    <>
      <ScreenScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Integração opcional"
          title="Catálogo Wger"
          description="Consulte o catálogo público e mantenha uma cópia dos exercícios escolhidos no aparelho."
        />

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Você controla cada consulta</Text>
          <Text style={styles.noticeText}>
            O app faz apenas requisições GET ao Wger. Nenhuma ficha, sessão, série, nota ou identificador local é enviado.
          </Text>
          <Text style={styles.noticeText}>
            Exercícios escolhidos ficam no SQLite. Imagens e vídeos remotos podem precisar de internet e cada item mantém autoria e licença.
          </Text>
          {!consented && (
            <PrimaryButton label="Entendi e quero continuar" onPress={() => setConsented(true)} />
          )}
        </View>

        {consented && (
          <>
            <Text style={styles.section}>BUSCA</Text>
            <ThemedTextInput
              accessibilityLabel="Buscar no Wger"
              placeholder="Nome do exercício"
              returnKeyType="search"
              value={controller.query.text}
              onChangeText={(text) => controller.setQuery((current) => ({ ...current, text }))}
              onSubmitEditing={() => void controller.search(1)}
              style={styles.search}
            />
            <Text style={styles.label}>Idioma preferido</Text>
            <View style={styles.chips}>
              {(['pt-br', 'en'] as const).map((language) => (
                <SelectableChip
                  key={language}
                  label={language === 'pt-br' ? 'Português' : 'Inglês'}
                  selected={controller.query.language === language}
                  onPress={() => controller.setQuery((current) => ({ ...current, language }))}
                />
              ))}
            </View>
            <Text style={styles.label}>Resultados por página</Text>
            <View style={styles.chips}>
              {[10, 20, 50].map((pageSize) => (
                <SelectableChip
                  key={pageSize}
                  label={String(pageSize)}
                  selected={controller.query.pageSize === pageSize}
                  onPress={() => controller.setQuery((current) => ({ ...current, pageSize }))}
                />
              ))}
            </View>
            <View style={styles.chips}>
              <SelectableChip
                label="Somente com imagem"
                selected={controller.query.onlyWithImage}
                onPress={() => controller.setQuery((current) => ({ ...current, onlyWithImage: !current.onlyWithImage }))}
              />
              <SelectableChip
                label="Somente com vídeo"
                selected={controller.query.onlyWithVideo}
                onPress={() => controller.setQuery((current) => ({ ...current, onlyWithVideo: !current.onlyWithVideo }))}
              />
            </View>
            <PrimaryButton
              label={controller.phase === 'loading' ? 'Consultando Wger…' : 'Buscar exercícios'}
              loading={controller.phase === 'loading'}
              onPress={() => void controller.search(1)}
            />

            {!!controller.importedCount && (
              <PrimaryButton
                secondary
                disabled={busy}
                label={`Atualizar ${controller.importedCount} importado(s)`}
                onPress={() => Alert.alert(
                  'Atualizar exercícios importados?',
                  `${controller.importedCount} item(ns) serão consultados. IDs locais, fichas e histórico serão preservados.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Atualizar', onPress: () => void controller.refreshImported() },
                  ],
                )}
              />
            )}
          </>
        )}

        {!!controller.items.length && (
          <>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.section}>RESULTADOS</Text>
                <Text style={styles.resultCount}>Página {controller.query.page} · {controller.total} no catálogo</Text>
              </View>
              <Text style={styles.selectedCount}>{controller.selected.size} selecionado(s)</Text>
            </View>
            <View style={styles.rowActions}>
              <SmallButton label="Selecionar página" onPress={controller.selectPage} />
              <SmallButton label="Limpar seleção" onPress={controller.clearSelection} />
            </View>
            {controller.items.map((item) => (
              <ResultCard
                key={item.externalId}
                item={item}
                selected={controller.selected.has(item.externalId)}
                existing={controller.existing.has(item.externalId)}
                onToggle={() => controller.toggle(item)}
                onPreview={() => controller.setPreview(item)}
              />
            ))}
            <PrimaryButton
              disabled={!controller.selected.size || busy}
              loading={controller.phase === 'importing'}
              label={`Importar selecionados (${controller.selected.size})`}
              onPress={() => Alert.alert(
                'Importar exercícios?',
                `${controller.selected.size} exercício(s) serão salvos no aparelho.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Importar', onPress: () => void controller.importSelected() },
                ],
              )}
            />
            <View style={styles.pagination}>
              <SmallButton
                label="← Página anterior"
                disabled={!controller.hasPrevious || busy}
                onPress={() => void controller.search(controller.query.page - 1)}
              />
              <SmallButton
                label="Próxima página →"
                disabled={!controller.hasNext || busy}
                onPress={() => void controller.search(controller.query.page + 1)}
              />
            </View>
          </>
        )}
      </ScreenScrollView>
      <CandidateModal
        candidate={controller.preview}
        onClose={() => controller.setPreview(null)}
        onSave={controller.savePreview}
      />
      <Toast message={controller.message.text} kind={controller.message.kind} />
    </>
  )
}

function ResultCard({
  item,
  selected,
  existing,
  onToggle,
  onPreview,
}: {
  item: ExternalExerciseCandidate
  selected: boolean
  existing: boolean
  onToggle: () => void
  onPreview: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const hasImage = item.media.some((media) => media.type === 'IMAGE')
  const hasVideo = item.media.some((media) => media.type === 'VIDEO')
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`Selecionar ${item.name}`}
        onPress={onToggle}
        style={[styles.checkbox, selected && styles.checkboxSelected]}
      >
        <Text style={styles.checkboxText}>{selected ? '✓' : ''}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPreview} style={styles.cardCopy}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.primaryMuscleGroup} · {item.equipment}</Text>
        <Text style={styles.cardMeta}>{item.category} · {item.language}</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>Wger</Text>
          {hasImage && <Text style={styles.badge}>Imagem</Text>}
          {hasVideo && <Text style={styles.badge}>Vídeo</Text>}
          {existing && <Text style={styles.badgeImported}>Já importado</Text>}
        </View>
      </Pressable>
      <Text style={styles.arrow}>›</Text>
    </View>
  )
}

function CandidateModal({
  candidate,
  onClose,
  onSave,
}: {
  candidate: ExternalExerciseCandidate | null
  onClose: () => void
  onSave: (candidate: ExternalExerciseCandidate) => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [draft, setDraft] = useState(candidate)
  useEffect(() => setDraft(candidate), [candidate])
  if (!draft) return null
  const mainMedia = draft.media.find((media) => media.main) ?? draft.media[0]
  const categories: ExerciseCategory[] = ['STRENGTH', 'CARDIO', 'MOBILITY', 'STRETCHING', 'RECOVERY', 'TECHNIQUE']
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pré-visualização</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar pré-visualização" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            {mainMedia?.type === 'IMAGE' && (
              <Image source={{ uri: mainMedia.thumbnailRemoteUrl ?? mainMedia.remoteUrl }} style={styles.previewImage} />
            )}
            <Text style={styles.previewName}>{draft.name}</Text>
            <Text style={styles.cardMeta}>{draft.description || 'Descrição não fornecida pela fonte.'}</Text>
            <Text style={styles.previewHeading}>Instruções</Text>
            <Text style={styles.previewBody}>{draft.instructions || 'Informação não fornecida pela fonte.'}</Text>
            <Text style={styles.label}>Categoria local</Text>
            <View style={styles.chips}>
              {categories.map((category) => (
                <SelectableChip
                  key={category}
                  label={category}
                  selected={draft.category === category}
                  onPress={() => setDraft((current) => current && ({ ...current, category }))}
                />
              ))}
            </View>
            <FormField label="Dificuldade" value={draft.difficulty} onChangeText={(difficulty) => setDraft((current) => current && ({ ...current, difficulty }))} />
            <FormField label="Músculo principal" value={draft.primaryMuscleGroup} onChangeText={(primaryMuscleGroup) => setDraft((current) => current && ({ ...current, primaryMuscleGroup }))} />
            <FormField label="Equipamento" value={draft.equipment} onChangeText={(equipment) => setDraft((current) => current && ({ ...current, equipment }))} />
            <Text style={styles.previewHeading}>Atribuição</Text>
            <Text style={styles.previewBody}>Autor: {draft.author || 'Informação não fornecida pela fonte'}</Text>
            <Text style={styles.previewBody}>Licença: {draft.licenseName || 'Informação não fornecida pela fonte'}</Text>
            {!!draft.warnings.length && <Text style={styles.warning}>{draft.warnings.join('\n')}</Text>}
            <LinkButton label="Abrir fonte original" url={draft.sourceUrl} />
            <LinkButton label="Consultar licença" url={draft.licenseUrl} />
            <PrimaryButton label="Aplicar ajustes" onPress={() => onSave(draft)} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function LinkButton({ label, url }: { label: string; url: string | null }) {
  const { colors } = useTheme()
  if (!url) return null
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={stylesStatic.linkButton}>
      <Text style={{ color: colors.primary, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  )
}

function SmallButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[stylesStatic.smallButton, { borderColor: colors.border, backgroundColor: colors.surface }, disabled && stylesStatic.disabled]}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  )
}

const stylesStatic = StyleSheet.create({
  smallButton: { borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 13 },
  disabled: { opacity: 0.45 },
  linkButton: { justifyContent: 'center', minHeight: 48 },
})

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 12 },
  notice: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: 10, padding: 18 },
  noticeTitle: { ...typography.titleSmall, color: colors.textPrimary },
  noticeText: { ...typography.bodySmall, color: colors.textSecondary },
  section: { ...typography.caption, color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.4, marginTop: 8 },
  search: { marginBottom: 2 },
  label: { ...typography.label, color: colors.textSecondary, fontWeight: '800', marginTop: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  resultCount: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  selectedCount: { ...typography.label, color: colors.primary, fontWeight: '800' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 112, padding: 13 },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 7, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxText: { color: colors.onPrimary, fontSize: 16, fontWeight: '900' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  cardMeta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  badge: { backgroundColor: colors.surfaceSecondary, borderRadius: 999, color: colors.textPrimary, fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeImported: { backgroundColor: colors.successSurface, borderRadius: 999, color: colors.success, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4 },
  arrow: { color: colors.textSecondary, fontSize: 24 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  backdrop: { backgroundColor: colors.scrim, flex: 1 },
  modalSafe: { backgroundColor: colors.background, flex: 1 },
  modalHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: shared.screen.horizontalPadding },
  modalTitle: { ...typography.titleSmall, color: colors.textPrimary },
  closeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  closeText: { color: colors.textPrimary, fontSize: 28 },
  modalContent: { gap: 12, padding: shared.screen.horizontalPadding, paddingBottom: 40 },
  previewImage: { aspectRatio: 16 / 9, backgroundColor: colors.surfaceSecondary, borderRadius: 18, width: '100%' },
  previewName: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  previewHeading: { ...typography.label, color: colors.textPrimary, fontWeight: '800', marginTop: 5 },
  previewBody: { ...typography.body, color: colors.textSecondary },
  warning: { ...typography.bodySmall, color: colors.warning },
})
